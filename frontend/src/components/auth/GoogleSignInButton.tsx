"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { verifyGoogleOAuthAction } from "@/app/actions/auth";

interface GoogleSignInButtonProps {
  onSuccess?: (redirectTo?: string) => void;
  onRequires2fa?: (ticket: string, email: string) => void;
  onError?: (error: string) => void;
  text?: string;
  redirectTo?: string;
  disabled?: boolean;
}

declare global {
  interface Window {
    google?: any;
    __agentix_google_callback?: (response: any) => void;
  }
}

export function GoogleSignInButton({
  onSuccess,
  onRequires2fa,
  onError,
  text = "Continue with Google",
  redirectTo,
  disabled = false,
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  useEffect(() => {
    if (!clientId) return;

    // Load Google Identity Services script if not already on page
    if (!document.getElementById("google-gsi-client")) {
      const script = document.createElement("script");
      script.id = "google-gsi-client";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, [clientId]);

  const handleCredentialResponse = async (credential: string) => {
    setIsLoading(true);
    try {
      const res = await verifyGoogleOAuthAction(credential, redirectTo);
      if (!res.success) {
        onError?.(res.error || "Google authentication failed.");
      } else if (res.requires2fa && res.ticket) {
        onRequires2fa?.(res.ticket, res.email || "");
      } else {
        onSuccess?.(res.redirectTo);
      }
    } catch {
      onError?.("An unexpected error occurred during Google sign-in.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = () => {
    if (disabled || isLoading) return;

    if (!clientId) {
      onError?.("Google OAuth is not configured on this environment. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID.");
      return;
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => {
          if (response?.credential) {
            handleCredentialResponse(response.credential);
          } else {
            onError?.("No credential received from Google.");
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback to standard Google OAuth 2.0 authorization redirect
          const redirectUri = typeof window !== "undefined" ? `${window.location.origin}/api/auth/callback/google` : "";
          const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=select_account`;
          window.location.href = authUrl;
        }
      });
    } else {
      // Standard OAuth 2.0 redirect fallback
      const redirectUri = typeof window !== "undefined" ? `${window.location.origin}/api/auth/callback/google` : "";
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=select_account`;
      window.location.href = authUrl;
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading}
      className="w-full py-2.5 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/80 hover:bg-[var(--surface-secondary)] hover:border-[var(--accent-primary)]/40 text-[var(--text-primary)] text-xs font-semibold flex items-center justify-center gap-2.5 shadow-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
    >
      {isLoading ? (
        <>
          <Loader2 size={16} className="animate-spin text-[var(--accent-primary)]" />
          <span>Connecting with Google...</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span className="transition-colors group-hover:text-[var(--text-primary)]">{text}</span>
        </>
      )}
    </button>
  );
}
