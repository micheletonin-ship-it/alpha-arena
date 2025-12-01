
// Railway-Ready Configuration
// Reads from environment variables in production (Railway)
// Falls back to hardcoded values for local development

export const APP_CREDENTIALS = {
    // Environment variables (Railway/Vite) take precedence
    // Fallback to hardcoded for local development
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || "https://ldhjnfzpkjsjplrxiwxp.supabase.co",
    SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkaGpuZnpwa2pzanBscnhpd3hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTQ0MTUsImV4cCI6MjA3OTYzMDQxNX0.eUmMNdKx9jtpSEE7VeiSarAXmpRnTNav3ycaf4sAG6w",
    
    // Alpaca Market Data API Keys
    // These keys are shared across all users for real-time price feeds
    ALPACA_KEY: import.meta.env.VITE_ALPACA_KEY || undefined,
    ALPACA_SECRET: import.meta.env.VITE_ALPACA_SECRET || undefined,
    
    // Gemini API Key (AI Services)
    // This key is shared across all users as fallback for AI features
    API_KEY: import.meta.env.VITE_API_KEY || undefined
};

// Usage:
// - Local Dev: Uses hardcoded values (no .env.local needed)
// - Railway Production: Uses VITE_SUPABASE_* environment variables from Railway dashboard
