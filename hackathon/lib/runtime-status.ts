import { getPrismaClient, hasDatabaseUrl } from "@/lib/prisma";
import { hasSupabaseAuthEnv } from "@/lib/supabase/auth-server";
import { hasSupabaseStorageEnv } from "@/lib/supabase/storage-admin";

export interface RuntimeDiagnostics {
  dataMode: "prisma_live" | "mock_fallback";
  database: "connected" | "missing" | "error";
  auth: "configured" | "missing";
  storage: "configured" | "missing";
}

export async function getRuntimeDiagnostics(): Promise<RuntimeDiagnostics> {
  const auth = hasSupabaseAuthEnv() ? "configured" : "missing";
  const storage = hasSupabaseStorageEnv() ? "configured" : "missing";

  if (!hasDatabaseUrl()) {
    return {
      dataMode: "mock_fallback",
      database: "missing",
      auth,
      storage,
    };
  }

  try {
    const prisma = getPrismaClient();
    await prisma.$queryRawUnsafe("select 1");

    return {
      dataMode: "prisma_live",
      database: "connected",
      auth,
      storage,
    };
  } catch {
    return {
      dataMode: "mock_fallback",
      database: "error",
      auth,
      storage,
    };
  }
}
