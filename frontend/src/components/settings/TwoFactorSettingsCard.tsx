"use client";

import React, { useState } from "react";
import { ShieldCheck, ShieldAlert, KeyRound, Lock, Loader2, Check, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { TwoFactorSetupModal } from "./TwoFactorSetupModal";
import { disable2faAction } from "@/app/actions/auth";

interface TwoFactorSettingsCardProps {
  initialEnabled?: boolean;
}

export function TwoFactorSettingsCard({ initialEnabled = false }: TwoFactorSettingsCardProps) {
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isDisableOpen, setIsDisableOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDisableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword || !disableCode || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await disable2faAction(disablePassword, disableCode);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to disable two-factor authentication.");
      } else {
        setIsEnabled(false);
        setIsDisableOpen(false);
        setDisablePassword("");
        setDisableCode("");
      }
    } catch {
      setErrorMessage("Network error while attempting to disable 2FA.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isEnabled
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-500"
                    : "bg-amber-500/10 border border-amber-500/30 text-amber-500"
                }`}
              >
                {isEnabled ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
              </div>
              <div>
                <CardTitle>Two-Factor Authentication (TOTP)</CardTitle>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  RFC 6238 time-based one-time password security for institutional logins.
                </p>
              </div>
            </div>

            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                isEnabled
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
              }`}
            >
              {isEnabled ? "ENABLED" : "NOT CONFIGURED"}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 text-xs">
          <p className="text-[var(--text-secondary)] leading-relaxed">
            Enhance account protection by requiring an authenticator code (such as Google Authenticator,
            1Password, or Microsoft Authenticator) whenever signing in from a new session or device.
          </p>

          <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="font-semibold text-[var(--text-primary)]">
                {isEnabled ? "Google Authenticator is Active" : "Protect your workspace"}
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                {isEnabled
                  ? "Your account requires an authenticator code or single-use recovery code on login."
                  : "Add an extra verification barrier against unauthorized access."}
              </div>
            </div>

            <div>
              {isEnabled ? (
                <button
                  type="button"
                  onClick={() => setIsDisableOpen(true)}
                  className="px-3 py-1.5 rounded-xl border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Disable 2FA
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSetupOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl teal-button-primary text-xs font-bold shadow-sm transition-transform cursor-pointer"
                >
                  Enable 2FA
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setup Modal */}
      <TwoFactorSetupModal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onSuccess={() => setIsEnabled(true)}
      />

      {/* Disable 2FA Modal */}
      {isDisableOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl p-6 text-[var(--text-primary)]">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500">
                <ShieldAlert size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight">Disable Two-Factor Authentication</h3>
                <p className="text-xs text-[var(--text-secondary)]">Confirm your identity to disable 2FA</p>
              </div>
            </div>

            {errorMessage && (
              <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleDisableSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-primary)]" htmlFor="disable-password">
                  Current Password
                </label>
                <input
                  id="disable-password"
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3 py-2 bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-xl text-xs font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-primary)]" htmlFor="disable-code">
                  6-Digit Authenticator Code (or Backup Code)
                </label>
                <input
                  id="disable-code"
                  type="text"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                  placeholder="000000"
                  required
                  className="w-full px-3 py-2 bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-xl text-xs font-mono tracking-widest text-center focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDisableOpen(false);
                    setErrorMessage(null);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !disablePassword || !disableCode}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : "Disable 2FA"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
