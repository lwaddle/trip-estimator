# Trip Estimator - Cloudflare Deployment Guide

This guide walks you through deploying the Trip Estimator application with Cloudflare Pages, D1 Database, and Zero Trust authentication.

## Prerequisites

- A Cloudflare account
- Wrangler CLI installed: `npm install -g wrangler`
- Git repository connected to Cloudflare Pages (or ready to deploy)

## Step 1: Install Wrangler CLI

If you haven't already installed Wrangler:

```bash
npm install -g wrangler
```

Login to your Cloudflare account:

```bash
wrangler login
```

## Step 2: Create D1 Database

Create your D1 database:

```bash
wrangler d1 create trip-estimator-db
```

This will output database information including the `database_id`. Copy this ID.

**Important:** Update the `wrangler.toml` file with your database ID:

```toml
[[d1_databases]]
binding = "DB"
database_name = "trip-estimator-db"
database_id = "YOUR_DATABASE_ID_HERE"  # Replace with your actual database ID
```

## Step 3: Run Database Migrations

Apply the database schema:

```bash
wrangler d1 execute trip-estimator-db --file=./migrations/0001_initial_schema.sql
```

Verify the tables were created:

```bash
wrangler d1 execute trip-estimator-db --command="SELECT name FROM sqlite_master WHERE type='table'"
```

You should see: `users` and `estimates` tables.

## Step 4: Deploy to Cloudflare Pages

### Option A: Deploy via Wrangler (Recommended)

From your project directory:

```bash
wrangler pages deploy . --project-name=trip-estimator
```

### Option B: Deploy via Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Pages** → **Create a project**
3. Connect your Git repository
4. Configure build settings:
   - **Build command:** (leave empty - static site)
   - **Build output directory:** `/`
   - **Root directory:** `/`

## Step 5: Bind D1 Database to Pages

After deploying, you need to bind the D1 database to your Pages project:

1. Go to **Cloudflare Dashboard** → **Pages** → **Your Project**
2. Click on **Settings** → **Functions**
3. Scroll to **D1 database bindings**
4. Click **Add binding**
5. Set:
   - **Variable name:** `DB`
   - **D1 database:** Select `trip-estimator-db`
6. Click **Save**

**OR** via Wrangler:

The binding should already be configured in `wrangler.toml`, but you can verify:

```bash
wrangler pages deployment list --project-name=trip-estimator
```

## Step 6: Configure Cloudflare Zero Trust

### 6.1 Enable Cloudflare Access

1. Go to **Cloudflare Dashboard** → **Zero Trust**
2. If not already set up, complete the Zero Trust onboarding

### 6.2 Create an Application

1. Navigate to **Access** → **Applications**
2. Click **Add an application**
3. Select **Self-hosted**
4. Configure:
   - **Application name:** `Trip Estimator`
   - **Session duration:** Choose your preferred duration (e.g., 24 hours)
   - **Application domain:** `your-trip-estimator.pages.dev` (or your custom domain)

### 6.3 Create Access Policy

1. In the same application setup, add a policy:
   - **Policy name:** `Authorized Users`
   - **Action:** `Allow`
   - **Configure rules:**
     - **Include:** `Emails`
     - Add your email address(es) that should have access
     - You can add multiple emails separated by commas

2. Click **Save**

### 6.4 Verify Zero Trust Headers

The application expects the `Cf-Access-Authenticated-User-Email` header from Cloudflare Access. This is automatically provided when a user authenticates through Zero Trust.

## Step 7: Test Your Deployment

1. Visit your Pages URL: `https://your-trip-estimator.pages.dev`
2. You should be redirected to Cloudflare Access login
3. Authenticate with an allowed email address
4. Once logged in, test the application:
   - Create a new estimate
   - Save it
   - Load it from the saved estimates list
   - Verify auto-save is working (every 2 minutes)
   - Export an estimate
   - Delete an estimate

## Step 8: Custom Domain (Optional)

To use a custom domain:

1. Go to **Pages** → **Your Project** → **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain name
4. Follow DNS configuration instructions
5. Update your Zero Trust application to use the custom domain

## Troubleshooting

### Database Not Found

If you get database errors:

```bash
# Verify database exists
wrangler d1 list

# Verify binding
wrangler pages deployment list --project-name=trip-estimator
```

### Authentication Not Working

- Verify the Zero Trust application is active
- Check that your email is in the allowed list
- Verify the application domain matches your Pages URL
- Check browser console for any CORS or authentication errors

### API Errors (500)

Check Pages Functions logs:

```bash
wrangler pages deployment tail --project-name=trip-estimator
```

Or view logs in Dashboard: **Pages** → **Your Project** → **Functions** → **Logs**

### Auto-save Not Working

- Check browser console for errors
- Verify the API endpoints are responding: `/api/estimates`
- Ensure you've created at least one estimate first (auto-save updates existing)

## Database Management

### View Data

Query the database:

```bash
# List all users
wrangler d1 execute trip-estimator-db --command="SELECT * FROM users"

# List all estimates
wrangler d1 execute trip-estimator-db --command="SELECT id, name, created_at FROM estimates"
```

### Backup Database

Export your database:

```bash
wrangler d1 export trip-estimator-db --output=backup.sql
```

### Restore from Backup

```bash
wrangler d1 execute trip-estimator-db --file=backup.sql
```

## Local Development

For local testing with D1:

```bash
wrangler pages dev . --d1 DB=trip-estimator-db
```

This will:
- Start a local server
- Use a local D1 instance
- Simulate the Pages Functions environment

**Note:** Local development won't have Zero Trust authentication. You may need to mock the authentication header for testing.

## Architecture Overview

```
User Request
    ↓
Cloudflare Zero Trust (Authentication)
    ↓
Cloudflare Pages (Static HTML/CSS/JS)
    ↓
Pages Functions (/api/estimates/*)
    ↓
D1 Database (users, estimates)
```

### Key Features

- **User Authentication:** Handled by Cloudflare Zero Trust
- **Data Persistence:** All estimates stored in D1 database
- **Auto-save:** Client-side auto-save every 2 minutes to server
- **Multi-device sync:** Access estimates from any authenticated device
- **No expiration:** Estimates stored indefinitely (no 7-day limit)
- **Export/Import:** JSON export/import for backup and sharing

## Security Considerations

1. **Email-based access control** - Only approved emails can access
2. **User isolation** - Each user can only access their own estimates
3. **HTTPS only** - All traffic encrypted via Cloudflare
4. **No client-side secrets** - Authentication handled by Cloudflare

## Next Steps

- Set up custom domain
- Add additional authorized users
- Configure session duration
- Set up monitoring and alerts
- Consider adding estimate sharing (future feature)

## Support

For issues or questions:
- Check Cloudflare Pages documentation
- Review Cloudflare D1 documentation
- Check Zero Trust documentation
- Review application logs in Cloudflare Dashboard
