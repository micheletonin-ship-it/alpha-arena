
// Railway-Ready Configuration
// Reads from environment variables in production (Railway)
// Falls back to hardcoded values for local development

export const APP_CREDENTIALS = {
    // Environment variables (Railway/Vite) take precedence
    // Fallback to hardcoded for local development
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || "https://ldhjnfzpkjsjplrxiwxp.supabase.co",
    SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkaGpuZnpwa2pzanBscnhpd3hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTQ0MTUsImV4cCI6MjA3OTYzMDQxNX0.eUmMNdKx9jtpSEE7VeiSarAXmpRnTNav3ycaf4sAG6w"
};

// Usage:
// - Local Dev: Uses hardcoded values (no .env.local needed)
// - Railway Production: Uses VITE_SUPABASE_* environment variables from Railway dashboard
