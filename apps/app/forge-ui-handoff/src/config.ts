const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

export const SUPABASE_URL = env.VITE_SUPABASE_URL ?? "https://quuvzuhbtatnnhxodbar.supabase.co";

export const SUPABASE_ANON_KEY =
  env.VITE_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1dXZ6dWhidGF0bm5oeG9kYmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MDA2NjgsImV4cCI6MjEwMzQ3NjY2OH0.HvERsHB2hL7W_C7kHNn3g4wMI4vKmN-UTmWmXl8AsKE";

export const PUBLISH_ENDPOINT = `${SUPABASE_URL}/functions/v1/publish-library-item`;
