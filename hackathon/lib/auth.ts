import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getPrismaClient, hasDatabaseUrl } from "@/lib/prisma";
import { createSupabaseAuthServerClient, hasSupabaseAuthEnv } from "@/lib/supabase/auth-server";

export interface CurrentProfile {
  fullName: string;
  role: string;
  organizationId: string;
  organizationName: string | null;
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  if (!hasSupabaseAuthEnv()) {
    return null;
  }

  try {
    const supabase = createSupabaseAuthServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
});

export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const user = await getCurrentUser();

  if (!user || !hasDatabaseUrl()) {
    return null;
  }

  try {
    const prisma = getPrismaClient();
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: {
        fullName: true,
        role: true,
        organizationId: true,
        organization: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!profile?.organizationId) {
      return null;
    }

    return {
      fullName: profile.fullName,
      role: profile.role,
      organizationId: profile.organizationId,
      organizationName: profile.organization?.name ?? null,
    };
  } catch {
    return null;
  }
});

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  return user;
}

export async function requireProfile() {
  const user = await requireUser();
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/account?message=Tenant profile not found for this user.");
  }

  return { user, profile };
}

export async function requireAdminProfile() {
  const context = await requireProfile();

  if (context.profile.role !== "admin") {
    redirect("/account?message=Admin access is required for this action.");
  }

  return context;
}
