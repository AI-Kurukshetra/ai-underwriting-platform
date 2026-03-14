import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseAuthServerClient, hasSupabaseAuthEnv } from "@/lib/supabase/auth-server";

function getSafeRedirectPath(input: string | null) {
  if (!input || !input.startsWith("/") || input.startsWith("//")) {
    return "/dashboard";
  }

  return input;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = getSafeRedirectPath(url.searchParams.get("next"));

  if (!hasSupabaseAuthEnv()) {
    return NextResponse.redirect(new URL("/auth/login?message=Invalid authentication link.", url.origin));
  }

  const supabase = createSupabaseAuthServerClient();
  let error: Error | null = null;

  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error;
  } else if (tokenHash && type) {
    const result = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    error = result.error;
  } else {
    return NextResponse.redirect(new URL("/auth/login?message=Invalid authentication link.", url.origin));
  }

  if (error) {
    return NextResponse.redirect(new URL(`/auth/login?message=${encodeURIComponent(error.message)}`, url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
