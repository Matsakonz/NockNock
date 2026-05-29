# Supabase Setup Guide

This guide will help you set up Supabase for the WhoPay application.

## Prerequisites

- A Supabase account (free tier is sufficient)
- Node.js installed

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in the project details:
   - Name: `whopay` (or your preferred name)
   - Database Password: (choose a strong password)
   - Region: Choose the region closest to your users
5. Click "Create new project"
6. Wait for the project to be provisioned (this may take a few minutes)

## Step 2: Get Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the following:
   - **Project URL** (looks like `https://xxxxxxxx.supabase.co`)
   - **anon public** API key (looks like a long JWT token)

## Step 3: Create the Database Table

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click "New Query"
4. Paste and run the following SQL:

```sql
-- Create the trips table
CREATE TABLE trips (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  info JSONB NOT NULL,
  members JSONB NOT NULL,
  expenses JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow read access for all users
CREATE POLICY "Allow read access" ON trips
  FOR SELECT
  USING (true);

-- Create a policy to allow insert/update for all users
-- Note: In production, you should restrict this based on authentication
CREATE POLICY "Allow insert/update" ON trips
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create an index on app_id for better query performance
CREATE INDEX idx_trips_app_id ON trips(app_id);

-- Enable realtime for the trips table
ALTER PUBLICATION supabase_realtime ADD TABLE trips;
```

## Step 4: Configure Your Application

### Option A: Using Environment Variables (Recommended)

1. Create a `.env` file in your project root:
```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_APP_ID=your_app_id
```

2. Update your `index.html` to load environment variables:
```html
<script>
  window.__supabase_config = JSON.stringify({
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
  });
  window.__app_id = import.meta.env.VITE_APP_ID || 'default-app-id';
</script>
```

### Option B: Using Vite Config (Alternative)

1. Install `@vitejs/plugin-react` (already installed)
2. Add to your `vite.config.js`:
```js
export default defineConfig({
  define: {
    __supabase_config: JSON.stringify({
      url: process.env.VITE_SUPABASE_URL,
      anonKey: process.env.VITE_SUPABASE_ANON_KEY
    }),
    __app_id: JSON.stringify(process.env.VITE_APP_ID || 'default-app-id')
  }
})
```

## Step 5: Run Your Application

1. Install dependencies (if not already done):
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to the URL shown (usually `http://localhost:5173`)

## Step 6: Test the Connection

1. The app should now connect to Supabase
2. You should see a "Cloud Sync" indicator in the top right corner
3. Create a new trip and verify it syncs to your Supabase database

## Troubleshooting

### Connection Issues
- Verify your Supabase URL and API key are correct
- Check that your Supabase project is active (not paused)
- Ensure the `trips` table exists and has the correct structure

### Realtime Not Working
- Verify that realtime is enabled for the `trips` table
- Check the Supabase dashboard → Database → Replication
- Ensure the publication includes the `trips` table

### Permission Errors
- Check your RLS policies in the Supabase dashboard
- Verify that the policies allow the operations you need
- For development, the policies above allow all operations

## Security Notes

⚠️ **Important for Production:**

- The current setup uses the `anon` key which is public
- In production, implement proper authentication
- Restrict RLS policies based on user authentication
- Consider using Supabase Auth for user management
- Never commit your `.env` file to version control

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
