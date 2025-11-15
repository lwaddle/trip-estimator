/**
 * Trip Estimator API - Pages Functions
 * Handles all CRUD operations for trip estimates with D1 database
 * Integrates with Cloudflare Zero Trust for user authentication
 */

// Helper function to decode JWT token without verification
// Cloudflare Access tokens are already verified by the Access layer
function decodeJWT(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid JWT format');
        }

        // Decode the payload (second part)
        const payload = parts[1];
        // Add padding if needed for base64url
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const paddedBase64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');

        const jsonPayload = atob(paddedBase64);
        return JSON.parse(jsonPayload);
    } catch (e) {
        throw new Error('Failed to decode JWT: ' + e.message);
    }
}

// Helper function to get user from Cloudflare Access JWT token
function getUserFromRequest(request) {
    // Try header first (for API calls that might pass it)
    let email = request.headers.get('Cf-Access-Authenticated-User-Email');

    if (email) {
        return email;
    }

    // Get JWT token from cookie
    const cookieHeader = request.headers.get('Cookie');
    if (!cookieHeader) {
        // Fallback for local development (no auth)
        return 'dev@localhost';
    }

    // Parse cookies to find CF_Authorization
    const cookies = {};
    cookieHeader.split(';').forEach(cookie => {
        const [name, ...rest] = cookie.trim().split('=');
        cookies[name] = rest.join('=');
    });

    const token = cookies['CF_Authorization'];
    if (!token) {
        // Fallback for local development (no auth)
        return 'dev@localhost';
    }

    // Decode the JWT to extract user email
    const payload = decodeJWT(token);
    email = payload.email;

    if (!email) {
        throw new Error('No email found in authentication token');
    }

    return email;
}

// Helper function to ensure user exists in database
async function ensureUser(db, email) {
    // Try to get existing user
    let user = await db.prepare('SELECT id, email FROM users WHERE email = ?')
        .bind(email)
        .first();

    if (!user) {
        // Create new user
        const result = await db.prepare(
            'INSERT INTO users (email, created_at, last_login) VALUES (?, unixepoch(), unixepoch())'
        ).bind(email).run();

        user = { id: result.meta.last_row_id, email };
    } else {
        // Update last login
        await db.prepare('UPDATE users SET last_login = unixepoch() WHERE id = ?')
            .bind(user.id)
            .run();
    }

    return user;
}

// Helper function to create JSON response
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        }
    });
}

// Helper function to create error response
function errorResponse(message, status = 400) {
    return jsonResponse({ error: message }, status);
}

// Main request handler
export async function onRequest(context) {
    const { request, env, params } = context;
    const url = new URL(request.url);
    const method = request.method;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            }
        });
    }

    try {
        // Get authenticated user
        const email = getUserFromRequest(request);
        const user = await ensureUser(env.DB, email);

        // Route handling based on path and method
        const route = params.route ? params.route.join('/') : '';

        // GET /api/estimates - List all estimates for user (owned + shared)
        if (method === 'GET' && !route) {
            // Get owned estimates
            const ownedEstimates = await env.DB.prepare(
                'SELECT id, name, created_at, updated_at FROM estimates WHERE user_id = ? ORDER BY updated_at DESC'
            ).bind(user.id).all();

            // Get estimates shared with user
            const sharedEstimates = await env.DB.prepare(`
                SELECT e.id, e.name, e.created_at, e.updated_at, u.email as owner_email
                FROM estimates e
                INNER JOIN estimate_shares s ON e.id = s.estimate_id
                INNER JOIN users u ON e.user_id = u.id
                WHERE s.shared_with_user_id = ?
                ORDER BY e.updated_at DESC
            `).bind(user.id).all();

            return jsonResponse({
                owned: ownedEstimates.results.map(est => ({
                    id: est.id,
                    name: est.name,
                    createdAt: est.created_at,
                    updatedAt: est.updated_at,
                    isOwner: true
                })),
                shared: sharedEstimates.results.map(est => ({
                    id: est.id,
                    name: est.name,
                    createdAt: est.created_at,
                    updatedAt: est.updated_at,
                    isOwner: false,
                    ownerEmail: est.owner_email
                }))
            });
        }

        // GET /api/estimates/:id - Get single estimate (requires ownership or share access)
        if (method === 'GET' && route && !route.includes('/')) {
            const estimateId = route;

            // Check if user owns the estimate OR has it shared with them
            const estimate = await env.DB.prepare(`
                SELECT e.*, u.email as owner_email,
                       CASE WHEN e.user_id = ? THEN 1 ELSE 0 END as is_owner
                FROM estimates e
                LEFT JOIN estimate_shares s ON e.id = s.estimate_id AND s.shared_with_user_id = ?
                LEFT JOIN users u ON e.user_id = u.id
                WHERE e.id = ? AND (e.user_id = ? OR s.id IS NOT NULL)
            `).bind(user.id, user.id, estimateId, user.id).first();

            if (!estimate) {
                return errorResponse('Estimate not found', 404);
            }

            const response = {
                id: estimate.id,
                name: estimate.name,
                data: JSON.parse(estimate.estimate_data),
                createdAt: estimate.created_at,
                updatedAt: estimate.updated_at,
                isOwner: estimate.is_owner === 1
            };

            // Add owner email if this is a shared estimate
            if (!response.isOwner) {
                response.ownerEmail = estimate.owner_email;
            }

            return jsonResponse(response);
        }

        // POST /api/estimates - Create new estimate
        if (method === 'POST' && !route) {
            const body = await request.json();

            if (!body.name || !body.data) {
                return errorResponse('Missing required fields: name, data');
            }

            // Generate unique ID
            const estimateId = `est_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            await env.DB.prepare(
                'INSERT INTO estimates (id, user_id, name, estimate_data, created_at, updated_at) VALUES (?, ?, ?, ?, unixepoch(), unixepoch())'
            ).bind(
                estimateId,
                user.id,
                body.name,
                JSON.stringify(body.data)
            ).run();

            return jsonResponse({
                id: estimateId,
                name: body.name,
                createdAt: Math.floor(Date.now() / 1000),
                updatedAt: Math.floor(Date.now() / 1000)
            }, 201);
        }

        // PUT /api/estimates/:id - Update estimate
        if (method === 'PUT' && route) {
            const estimateId = route;
            const body = await request.json();

            if (!body.name && !body.data) {
                return errorResponse('Must provide name or data to update');
            }

            // Verify ownership
            const existing = await env.DB.prepare(
                'SELECT id FROM estimates WHERE id = ? AND user_id = ?'
            ).bind(estimateId, user.id).first();

            if (!existing) {
                return errorResponse('Estimate not found', 404);
            }

            // Build update query dynamically
            const updates = [];
            const values = [];

            if (body.name) {
                updates.push('name = ?');
                values.push(body.name);
            }

            if (body.data) {
                updates.push('estimate_data = ?');
                values.push(JSON.stringify(body.data));
            }

            updates.push('updated_at = unixepoch()');
            values.push(estimateId, user.id);

            await env.DB.prepare(
                `UPDATE estimates SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
            ).bind(...values).run();

            return jsonResponse({
                id: estimateId,
                name: body.name,
                updatedAt: Math.floor(Date.now() / 1000)
            });
        }

        // DELETE /api/estimates/:id - Delete estimate
        if (method === 'DELETE' && route && !route.includes('/')) {
            const estimateId = route;

            const result = await env.DB.prepare(
                'DELETE FROM estimates WHERE id = ? AND user_id = ?'
            ).bind(estimateId, user.id).run();

            if (result.meta.changes === 0) {
                return errorResponse('Estimate not found', 404);
            }

            return jsonResponse({ success: true });
        }

        // POST /api/estimates/:id/share - Share estimate with user by email
        if (method === 'POST' && route.endsWith('/share')) {
            const estimateId = route.replace('/share', '');
            const body = await request.json();

            if (!body.email) {
                return errorResponse('Email is required');
            }

            // Verify user owns the estimate
            const estimate = await env.DB.prepare(
                'SELECT id FROM estimates WHERE id = ? AND user_id = ?'
            ).bind(estimateId, user.id).first();

            if (!estimate) {
                return errorResponse('Estimate not found or you do not have permission to share it', 403);
            }

            // Prevent sharing with self
            if (body.email.toLowerCase() === email.toLowerCase()) {
                return errorResponse('Cannot share estimate with yourself', 400);
            }

            // Get or create recipient user
            const recipient = await ensureUser(env.DB, body.email);

            // Create share (INSERT OR IGNORE to handle duplicates gracefully)
            await env.DB.prepare(
                'INSERT OR IGNORE INTO estimate_shares (estimate_id, owner_user_id, shared_with_user_id) VALUES (?, ?, ?)'
            ).bind(estimateId, user.id, recipient.id).run();

            return jsonResponse({
                success: true,
                sharedWith: body.email
            });
        }

        // DELETE /api/estimates/:id/share - Unshare estimate (revoke access)
        if (method === 'DELETE' && route.includes('/share/')) {
            const parts = route.split('/');
            const estimateId = parts[0];
            const sharedEmail = decodeURIComponent(parts[2]);

            // Verify user owns the estimate
            const estimate = await env.DB.prepare(
                'SELECT id FROM estimates WHERE id = ? AND user_id = ?'
            ).bind(estimateId, user.id).first();

            if (!estimate) {
                return errorResponse('Estimate not found or you do not have permission to manage sharing', 403);
            }

            // Get the user to unshare from
            const recipient = await env.DB.prepare(
                'SELECT id FROM users WHERE email = ?'
            ).bind(sharedEmail).first();

            if (!recipient) {
                return errorResponse('User not found', 404);
            }

            // Remove the share
            await env.DB.prepare(
                'DELETE FROM estimate_shares WHERE estimate_id = ? AND owner_user_id = ? AND shared_with_user_id = ?'
            ).bind(estimateId, user.id, recipient.id).run();

            return jsonResponse({ success: true });
        }

        // GET /api/estimates/:id/shares - Get list of users estimate is shared with
        if (method === 'GET' && route.endsWith('/shares')) {
            const estimateId = route.replace('/shares', '');

            // Verify user owns the estimate
            const estimate = await env.DB.prepare(
                'SELECT id FROM estimates WHERE id = ? AND user_id = ?'
            ).bind(estimateId, user.id).first();

            if (!estimate) {
                return errorResponse('Estimate not found or you do not have permission to view sharing', 403);
            }

            // Get list of shared users
            const shares = await env.DB.prepare(`
                SELECT u.email, s.shared_at
                FROM estimate_shares s
                INNER JOIN users u ON s.shared_with_user_id = u.id
                WHERE s.estimate_id = ? AND s.owner_user_id = ?
                ORDER BY s.shared_at DESC
            `).bind(estimateId, user.id).all();

            return jsonResponse({
                shares: shares.results.map(share => ({
                    email: share.email,
                    sharedAt: share.shared_at
                }))
            });
        }

        // POST /api/estimates/:id/copy - Create a copy of an estimate
        if (method === 'POST' && route.endsWith('/copy')) {
            const estimateId = route.replace('/copy', '');

            // Check if user has access to this estimate (owner OR shared)
            const estimate = await env.DB.prepare(`
                SELECT e.*
                FROM estimates e
                LEFT JOIN estimate_shares s ON e.id = s.estimate_id AND s.shared_with_user_id = ?
                WHERE e.id = ? AND (e.user_id = ? OR s.id IS NOT NULL)
            `).bind(user.id, estimateId, user.id).first();

            if (!estimate) {
                return errorResponse('Estimate not found or you do not have access to it', 404);
            }

            // Generate new ID for the copy
            const newEstimateId = `est_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const newName = `Copy of ${estimate.name}`;

            // Create the copy
            await env.DB.prepare(
                'INSERT INTO estimates (id, user_id, name, estimate_data, created_at, updated_at) VALUES (?, ?, ?, ?, unixepoch(), unixepoch())'
            ).bind(
                newEstimateId,
                user.id,
                newName,
                estimate.estimate_data
            ).run();

            return jsonResponse({
                id: newEstimateId,
                name: newName,
                createdAt: Math.floor(Date.now() / 1000),
                updatedAt: Math.floor(Date.now() / 1000)
            }, 201);
        }

        // Method not allowed
        return errorResponse('Method not allowed', 405);

    } catch (error) {
        console.error('API Error:', error);
        return errorResponse(error.message || 'Internal server error', 500);
    }
}
