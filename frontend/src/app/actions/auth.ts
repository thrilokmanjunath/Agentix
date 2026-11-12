"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";

export interface LoginResult {
  success: boolean;
  error?: string;
  redirectTo?: string;
}

/**
 * Server Action for credential-based authentication.
 * Executes on the server to prevent client-side CORS, CSRF race conditions,
 * and fetch abortion exceptions (ClientFetchError: Load failed).
 */
export async function loginWithCredentials(
  emailInput: string,
  passwordInput: string,
  redirectToParam?: string | null
): Promise<LoginResult> {
  const email = emailInput?.trim().toLowerCase();
  const password = passwordInput?.trim();

  if (!email || !password) {
    return { success: false, error: "Please provide both email and password." };
  }

  const targetRedirect = redirectToParam || "/dashboard";

  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      redirectTo: targetRedirect,
    });

    if (typeof result === "string") {
      if (result.includes("error=CredentialsSignin") || result.includes("error=Callback")) {
        return { success: false, error: "Invalid credentials. Please verify your email and password." };
      }
      try {
        const parsed = new URL(result);
        return { success: true, redirectTo: parsed.pathname + parsed.search };
      } catch {
        return { success: true, redirectTo: result };
      }
    }

    return { success: true, redirectTo: targetRedirect };
  } catch (error: any) {
    // Next.js redirect thrown by signIn
    if (error?.digest?.startsWith("NEXT_REDIRECT") || error?.message === "NEXT_REDIRECT") {
      const redirectTarget = error?.digest?.split(";")?.[2] || "";
      if (redirectTarget.includes("error=")) {
        return { success: false, error: "Invalid credentials. Please verify your email and password." };
      }
      try {
        const parsed = new URL(redirectTarget);
        return { success: true, redirectTo: parsed.pathname + parsed.search };
      } catch {
        return { success: true, redirectTo: redirectTarget || targetRedirect };
      }
    }

    if (error instanceof AuthError || error?.type === "CredentialsSignin") {
      return { success: false, error: "Invalid credentials. Please verify your email and password." };
    }

    return { success: false, error: "Authentication failed. Please verify your credentials." };
  }
}

/**
 * Server Action for session termination.
 * Clears authentication cookies server-side and redirects to login,
 * bypassing client-side BroadcastChannel and window.location race conditions.
 */
export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
