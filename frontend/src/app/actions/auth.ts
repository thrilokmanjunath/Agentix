"use server";

import { signIn, signOut, auth } from "@/auth";
import { AuthError } from "next-auth";
import { getServerBackendBase } from "@/lib/backendServer";
import { signBackendJwt } from "@/lib/backendJwt";

export interface LoginResult {
  success: boolean;
  error?: string;
  redirectTo?: string;
  requires2fa?: boolean;
  ticket?: string;
  email?: string;
}

export interface TwoFactorSetupResult {
  success: boolean;
  error?: string;
  secret?: string;
  otpauth_uri?: string;
  qr_code?: string;
}

export interface TwoFactorConfirmResult {
  success: boolean;
  error?: string;
  backup_codes?: string[];
}

export interface SessionItem {
  id: string;
  ip_address?: string;
  user_agent?: string;
  device_type?: string;
  last_active?: string;
  created_at?: string;
}

async function getAuthenticatedBackendToken(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.email) return null;

  const directToken = (session as any)?.backendAccessToken;
  if (directToken && typeof directToken === "string") {
    return directToken;
  }

  try {
    return signBackendJwt({
      sub: session.user.id,
      email: session.user.email,
      role: ((session.user as { role?: string }).role || "USER").toLowerCase(),
      tenant_id: "default",
    });
  } catch {
    return null;
  }
}

/**
 * Server Action for credential-based authentication with 2FA interception.
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
  const backendBase = getServerBackendBase();

  // 1. Probe backend login for 2FA check and direct token minting
  if (backendBase) {
    try {
      const probeRes = await fetch(`${backendBase}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: email, password }),
        cache: "no-store",
      });

      if (probeRes.ok) {
        const probeData = await probeRes.json();
        if (probeData?.requires_2fa && probeData?.ticket) {
          return {
            success: true,
            requires2fa: true,
            ticket: probeData.ticket,
            email: email,
          };
        }
        if (probeData?.access_token) {
          await signIn("credentials", {
            email,
            password,
            verifiedToken: probeData.access_token,
            redirect: false,
          });
          return { success: true, redirectTo: targetRedirect };
        }
      } else if (probeRes.status === 401) {
        return { success: false, error: "Incorrect email or password." };
      }
    } catch (e) {
      console.warn("[AuthAction] Backend probe deferred to standard credentials sign-in:", e);
    }
  }

  // 2. Fallback to standard NextAuth credentials authorize
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
 * Server Action for resolving 2FA challenge via TOTP code or Recovery Backup Code.
 */
export async function verify2faChallenge(
  ticket: string,
  code: string,
  isBackup: boolean = false,
  redirectToParam?: string | null
): Promise<LoginResult> {
  const backendBase = getServerBackendBase();
  if (!backendBase) {
    return { success: false, error: "Backend server is unavailable for 2FA verification." };
  }

  const endpoint = isBackup ? "/api/v1/auth/2fa/backup" : "/api/v1/auth/2fa/challenge";
  const body = isBackup ? { ticket, backup_code: code } : { ticket, code };
  const targetRedirect = redirectToParam || "/dashboard";

  try {
    const res = await fetch(`${backendBase}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        error: data?.detail || (isBackup ? "Invalid or already consumed backup code." : "Invalid 2FA code. Please retry."),
      };
    }

    const token = data?.access_token;
    const email = data?.user?.email;
    if (!token || !email) {
      return { success: false, error: "Missing session token in 2FA verification response." };
    }

    // Sign into NextAuth using the pre-verified backend token
    await signIn("credentials", {
      email,
      verifiedToken: token,
      redirect: false,
    });

    return { success: true, redirectTo: targetRedirect };
  } catch (e: any) {
    console.error("[AuthAction] 2FA challenge error:", e);
    return { success: false, error: "An unexpected error occurred during two-factor verification." };
  }
}

/**
 * Server Action for Google Sign-In verification via Google Identity Services token.
 */
export async function verifyGoogleOAuthAction(
  credential: string,
  redirectToParam?: string | null
): Promise<LoginResult> {
  const backendBase = getServerBackendBase();
  if (!backendBase) {
    return { success: false, error: "Backend server is unavailable for Google verification." };
  }

  const targetRedirect = redirectToParam || "/dashboard";

  try {
    const res = await fetch(`${backendBase}/api/v1/auth/google/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: credential }),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data?.detail || "Google authentication verification failed." };
    }

    if (data?.requires_2fa && data?.ticket) {
      return {
        success: true,
        requires2fa: true,
        ticket: data.ticket,
        email: data.email,
      };
    }

    const token = data?.access_token;
    const email = data?.user?.email;
    if (!token || !email) {
      return { success: false, error: "Missing authentication session from Google verification." };
    }

    await signIn("credentials", {
      email,
      verifiedToken: token,
      redirect: false,
    });

    return { success: true, redirectTo: targetRedirect };
  } catch (e: any) {
    console.error("[AuthAction] Google OAuth error:", e);
    return { success: false, error: "Failed to authenticate with Google. Please retry." };
  }
}

/**
 * Initiate 2FA Enrollment: generates TOTP secret, URI, and QR code SVG.
 */
export async function setup2faAction(): Promise<TwoFactorSetupResult> {
  const token = await getAuthenticatedBackendToken();
  const backendBase = getServerBackendBase();
  if (!token || !backendBase) {
    return { success: false, error: "You must be authenticated to configure two-factor authentication." };
  }

  try {
    const res = await fetch(`${backendBase}/api/v1/auth/2fa/setup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data?.detail || "Failed to initialize 2FA setup." };
    }

    return {
      success: true,
      secret: data.secret,
      otpauth_uri: data.otpauth_uri,
      qr_code: data.qr_code,
    };
  } catch (e: any) {
    return { success: false, error: e?.message || "Failed to communicate with authentication service." };
  }
}

/**
 * Confirm 2FA Enrollment: validates code, activates 2FA, and returns backup codes.
 */
export async function confirm2faAction(code: string): Promise<TwoFactorConfirmResult> {
  const token = await getAuthenticatedBackendToken();
  const backendBase = getServerBackendBase();
  if (!token || !backendBase) {
    return { success: false, error: "Not authenticated." };
  }

  try {
    const res = await fetch(`${backendBase}/api/v1/auth/2fa/verify-setup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code: code.trim() }),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data?.detail || "Invalid verification code." };
    }

    return {
      success: true,
      backup_codes: data.backup_codes || [],
    };
  } catch (e: any) {
    return { success: false, error: e?.message || "Failed to confirm 2FA enrollment." };
  }
}

/**
 * Disable 2FA: requires current password and current TOTP/backup code.
 */
export async function disable2faAction(password: string, code: string): Promise<{ success: boolean; error?: string }> {
  const token = await getAuthenticatedBackendToken();
  const backendBase = getServerBackendBase();
  if (!token || !backendBase) {
    return { success: false, error: "Not authenticated." };
  }

  try {
    const res = await fetch(`${backendBase}/api/v1/auth/2fa/disable`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password, code: code.trim() }),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data?.detail || "Failed to disable 2FA." };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || "Failed to disable 2FA." };
  }
}

/**
 * Fetch list of active user sessions from backend.
 */
export async function fetchActiveSessionsAction(): Promise<{ success: boolean; sessions?: SessionItem[]; error?: string }> {
  const token = await getAuthenticatedBackendToken();
  const backendBase = getServerBackendBase();
  if (!token || !backendBase) {
    return { success: false, error: "Not authenticated." };
  }

  try {
    const res = await fetch(`${backendBase}/api/v1/auth/sessions`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data?.detail || "Failed to fetch sessions." };
    }

    return { success: true, sessions: data.sessions || [] };
  } catch (e: any) {
    return { success: false, error: e?.message || "Failed to fetch sessions." };
  }
}

/**
 * Revoke specific session or all other sessions.
 */
export async function revokeSessionAction(
  sessionId?: string,
  revokeAllOthers?: boolean
): Promise<{ success: boolean; error?: string }> {
  const token = await getAuthenticatedBackendToken();
  const backendBase = getServerBackendBase();
  if (!token || !backendBase) {
    return { success: false, error: "Not authenticated." };
  }

  try {
    const res = await fetch(`${backendBase}/api/v1/auth/sessions/revoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ session_id: sessionId, revoke_all_others: revokeAllOthers }),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data?.detail || "Failed to revoke session." };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || "Failed to revoke session." };
  }
}

/**
 * Server Action for session termination.
 */
export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
