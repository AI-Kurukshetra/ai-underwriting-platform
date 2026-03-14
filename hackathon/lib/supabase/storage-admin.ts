import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let storageClient: SupabaseClient<any> | null = null;

export function hasSupabaseStorageEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createSupabaseStorageAdminClient() {
  if (!hasSupabaseStorageEnv()) {
    throw new Error("Supabase storage admin environment variables are missing.");
  }

  storageClient ??= createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  return storageClient;
}
