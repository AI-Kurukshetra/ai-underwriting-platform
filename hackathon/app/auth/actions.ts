"use server";

import { redirect } from "next/navigation";
import { getPrismaClient, hasDatabaseUrl } from "@/lib/prisma";
import { createSupabaseAuthServerClient, hasSupabaseAuthEnv } from "@/lib/supabase/auth-server";

function getMessagePath(path: string, message: string, next?: string) {
  const params = new URLSearchParams({ message });

  if (next) {
    params.set("next", next);
  }

  return `${path}?${params.toString()}`;
}

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getSafeRedirectPath(input: string) {
  if (!input || !input.startsWith("/") || input.startsWith("//")) {
    return "/dashboard";
  }

  return input;
}

async function provisionOrganization(userId: string, organizationName: string, fullName: string) {
  if (!hasDatabaseUrl()) {
    throw new Error("Workspace data connection is not configured.");
  }

  const prisma = getPrismaClient();

  await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: organizationName },
      select: { id: true },
    });

    const organizationId = organization.id;

    await tx.profile.upsert({
      where: { id: userId },
      update: {
        organizationId,
        fullName,
        role: "admin",
      },
      create: {
        id: userId,
        organizationId,
        fullName,
        role: "admin",
      },
    });

    await tx.modelVersion.create({
      data: {
        organizationId,
        name: "Gradient Lite",
        version: "1.0.0",
        status: "champion",
        auc: 0.84,
        precision: 0.79,
        recall: 0.76,
        drift: 0.8,
        trafficShare: 70,
        approvalThreshold: 35,
        notes: "Initial workspace baseline model created during onboarding.",
        deployedAt: new Date(),
      },
    });

    await tx.workflow.create({
      data: {
        organizationId,
        name: "MVP auto-decision flow",
        config: {
          autoApproveBelow: 35,
          declineAboveOrEqual: 65,
          fraudEscalationAt: 70,
          maxDebtToIncome: 0.45,
          minDocumentConfidence: 0.74,
          highAmountManualReviewAbove: 20000,
          defaultReviewStage: "underwriter_review",
          fraudReviewStage: "fraud_review",
        },
      },
    });

    await tx.portfolioMetric.createMany({
      data: [
        {
          organizationId,
          label: "Book premium equivalent",
          value: "$0",
          delta: "New workspace",
          tone: "neutral",
        },
        {
          organizationId,
          label: "Average expected loss ratio",
          value: "0%",
          delta: "No submissions yet",
          tone: "neutral",
        },
        {
          organizationId,
          label: "High-risk concentration",
          value: "0%",
          delta: "No submissions yet",
          tone: "positive",
        },
      ],
    });
  });
}

export async function signInAction(formData: FormData) {
  if (!hasSupabaseAuthEnv()) {
    redirect(getMessagePath("/auth/login", "Workspace sign-in is not configured."));
  }

  const email = getStringValue(formData, "email");
  const password = getStringValue(formData, "password");
  const next = getSafeRedirectPath(getStringValue(formData, "next"));

  if (!email || !password) {
    redirect(getMessagePath("/auth/login", "Email and password are required.", next));
  }

  const supabase = createSupabaseAuthServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(getMessagePath("/auth/login", error.message, next));
  }

  redirect(next);
}

export async function signUpAction(formData: FormData) {
  if (!hasSupabaseAuthEnv()) {
    redirect(getMessagePath("/auth/sign-up", "Workspace sign-in is not configured."));
  }

  if (!hasDatabaseUrl()) {
    redirect(getMessagePath("/auth/sign-up", "Workspace data connection is not configured."));
  }

  const fullName = getStringValue(formData, "fullName");
  const organizationName = getStringValue(formData, "organizationName");
  const email = getStringValue(formData, "email");
  const password = getStringValue(formData, "password");
  const next = getSafeRedirectPath(getStringValue(formData, "next"));

  if (!fullName || !organizationName || !email || !password) {
    redirect(getMessagePath("/auth/sign-up", "All fields are required.", next));
  }

  const emailRedirectTo = new URL(
    `/auth/callback?next=${encodeURIComponent(next)}`,
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ).toString();

  const supabase = createSupabaseAuthServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: {
        full_name: fullName,
        organization_name: organizationName,
      },
    },
  });

  if (error) {
    redirect(getMessagePath("/auth/sign-up", error.message, next));
  }

  const user = data.user;

  if (!user) {
    redirect(getMessagePath("/auth/sign-up", "Unable to create user.", next));
  }

  try {
    await provisionOrganization(user.id, organizationName, fullName);
  } catch (provisionError) {
    const message =
      provisionError instanceof Error
        ? provisionError.message
        : "User created, but workspace provisioning failed.";
    redirect(getMessagePath("/auth/login", message));
  }

  if (data.session) {
    redirect(next);
  }

  redirect(
    getMessagePath(
      "/auth/login",
      "Account created. Check your email to confirm your sign-in link, then log in.",
      next,
    ),
  );
}

export async function signOutAction() {
  if (hasSupabaseAuthEnv()) {
    const supabase = createSupabaseAuthServerClient();
    await supabase.auth.signOut();
  }

  redirect("/");
}

export async function requestPasswordResetAction(formData: FormData) {
  if (!hasSupabaseAuthEnv()) {
    redirect(getMessagePath("/auth/forgot-password", "Password recovery is not configured."));
  }

  const email = getStringValue(formData, "email");

  if (!email) {
    redirect(getMessagePath("/auth/forgot-password", "Email is required."));
  }

  const redirectTo = new URL(
    `/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`,
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ).toString();

  const supabase = createSupabaseAuthServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    redirect(getMessagePath("/auth/forgot-password", error.message));
  }

  redirect(getMessagePath("/auth/login", "Password reset link sent. Check your email."));
}

export async function resetPasswordAction(formData: FormData) {
  if (!hasSupabaseAuthEnv()) {
    redirect(getMessagePath("/auth/reset-password", "Password reset is not configured."));
  }

  const password = getStringValue(formData, "password");
  const confirmPassword = getStringValue(formData, "confirmPassword");

  if (!password || password.length < 6) {
    redirect(getMessagePath("/auth/reset-password", "Password must be at least 6 characters."));
  }

  if (password !== confirmPassword) {
    redirect(getMessagePath("/auth/reset-password", "Passwords do not match."));
  }

  const supabase = createSupabaseAuthServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(getMessagePath("/auth/reset-password", error.message));
  }

  redirect(getMessagePath("/auth/login", "Password updated. Please sign in again."));
}

export async function changeEmailAction(formData: FormData) {
  if (!hasSupabaseAuthEnv()) {
    redirect(getMessagePath("/account", "Email change is not configured."));
  }

  const email = getStringValue(formData, "email");

  if (!email) {
    redirect(getMessagePath("/account", "A new email address is required."));
  }

  const emailRedirectTo = new URL(
    `/auth/callback?next=${encodeURIComponent("/account")}`,
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ).toString();

  const supabase = createSupabaseAuthServerClient();
  const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo });

  if (error) {
    redirect(getMessagePath("/account", error.message));
  }

  redirect(getMessagePath("/account", "Email change requested. Confirm the link sent to your new address."));
}

export async function changePasswordAction(formData: FormData) {
  if (!hasSupabaseAuthEnv()) {
    redirect(getMessagePath("/account", "Password change is not configured."));
  }

  const password = getStringValue(formData, "password");
  const confirmPassword = getStringValue(formData, "confirmPassword");

  if (!password || password.length < 6) {
    redirect(getMessagePath("/account", "New password must be at least 6 characters."));
  }

  if (password !== confirmPassword) {
    redirect(getMessagePath("/account", "Passwords do not match."));
  }

  const supabase = createSupabaseAuthServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(getMessagePath("/account", error.message));
  }

  redirect(getMessagePath("/account", "Password updated successfully."));
}
