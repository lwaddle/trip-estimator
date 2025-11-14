/**
 * Trip Estimator API - Pages Functions
 * Handles all CRUD operations for trip estimates with D1 database
 * Integrates with Cloudflare Zero Trust for user authentication
 */

// Development mode - set to true to bypass authentication for testing
// IMPORTANT: Set to false before deploying to production with Zero Trust
const DEV_MODE = false;
const DEV_USER_EMAIL = 'dev@trip-estimator.local';

// Helper function to get user from Cloudflare Access headers
function getUserFromRequest(request) {
    // Development mode: use mock email for testing
    if (DEV_MODE) {
        console.log('[DEV MODE] Using development user:', DEV_USER_EMAIL);
        return DEV_USER_EMAIL;
    }

    // DEBUG: Log all headers to troubleshoot authentication
    console.log('[AUTH DEBUG] Request headers:');
    for (const [key, value] of request.headers.entries()) {
        if (key.toLowerCase().includes('cf-access') || key.toLowerCase().includes('auth')) {
            console.log(`  ${key}: ${value}`);
        }
    }

    // Production mode: require Cloudflare Access authentication
    // Cloudflare Access passes user email in the Cf-Access-Authenticated-User-Email header
    const email = request.headers.get('Cf-Access-Authenticated-User-Email');

    console.log('[AUTH DEBUG] Extracted email:', email || 'NONE');

    if (!email) {
        throw new Error('No authenticated user found');
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

        // GET /api/estimates - List all estimates for user
        if (method === 'GET' && !route) {
            const estimates = await env.DB.prepare(
                'SELECT id, name, created_at, updated_at FROM estimates WHERE user_id = ? ORDER BY updated_at DESC'
            ).bind(user.id).all();

            return jsonResponse({
                estimates: estimates.results.map(est => ({
                    id: est.id,
                    name: est.name,
                    createdAt: est.created_at,
                    updatedAt: est.updated_at
                }))
            });
        }

        // GET /api/estimates/:id - Get single estimate
        if (method === 'GET' && route) {
            const estimateId = route;
            const estimate = await env.DB.prepare(
                'SELECT * FROM estimates WHERE id = ? AND user_id = ?'
            ).bind(estimateId, user.id).first();

            if (!estimate) {
                return errorResponse('Estimate not found', 404);
            }

            return jsonResponse({
                id: estimate.id,
                name: estimate.name,
                data: JSON.parse(estimate.estimate_data),
                createdAt: estimate.created_at,
                updatedAt: estimate.updated_at
            });
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
        if (method === 'DELETE' && route) {
            const estimateId = route;

            const result = await env.DB.prepare(
                'DELETE FROM estimates WHERE id = ? AND user_id = ?'
            ).bind(estimateId, user.id).run();

            if (result.meta.changes === 0) {
                return errorResponse('Estimate not found', 404);
            }

            return jsonResponse({ success: true });
        }

        // Method not allowed
        return errorResponse('Method not allowed', 405);

    } catch (error) {
        console.error('API Error:', error);
        return errorResponse(error.message || 'Internal server error', 500);
    }
}
