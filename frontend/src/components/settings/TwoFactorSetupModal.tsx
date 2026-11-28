"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Copy,
  Check,
  Download,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { setup2faAction, confirm2faAction } from "@/app/actions/auth";

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TwoFactorSetupModal({
  isOpen,
  onClose,
  onSuccess,
}: TwoFactorSetupModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [secret, setSecret] = useState<string>("");
  const [qrCode, setQrCode] = useState<string>("");
  const [otpauthUri, setOtpauthUri] = useState<string>("");
  const [verifyCode, setVerifyCode] = useState<string>("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSecret("");
      setQrCode("");
      setVerifyCode("");
      setBackupCodes([]);
      setErrorMessage(null);
      return;
    }

    const initSetup = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const res = await setup2faAction();
        if (!res.success) {
          setErrorMessage(res.error || "Failed to initiate two-factor setup.");
        } else {
          setSecret(res.secret || "");
          setQrCode(res.qr_code || "");
          setOtpauthUri(res.otpauth_uri || "");
        }
      } catch {
        setErrorMessage("An unexpected error occurred while communicating with auth server.");
      } finally {
        setIsLoading(false);
      }
    };

    initSetup();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch {}
  };

  const handleCopyBackupCodes = async () => {
    if (backupCodes.length === 0) return;
    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"));
      setCopiedBackupCodes(true);
      setTimeout(() => setCopiedBackupCodes(false), 2000);
    } catch {}
  };

  const handleDownloadBackupCodes = () => {
    if (backupCodes.length === 0) return;
    const content = `AGENTIX 2FA RECOVERY BACKUP CODES\nGenerated: ${new Date().toISOString()}\n\nKeep these single-use codes stored in a secure offline location:\n\n${backupCodes.join("\n")}\n\nEach code can be used once to access your workspace if your authenticator device is lost.`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "agentix-2fa-backup-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleConfirmVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyCode.trim().length !== 6 || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await confirm2faAction(verifyCode.trim());
      if (!res.success) {
        setErrorMessage(res.error || "Invalid verification code. Please check your authenticator app.");
      } else {
        setBackupCodes(res.backup_codes || []);
        setStep(3);
      }
    } catch {
      setErrorMessage("Failed to verify code. Please check your network connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = () => {
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden p-6 text-[var(--text-primary)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Configure Google Authenticator (TOTP)</h3>
              <p className="text-xs text-[var(--text-secondary)]">Step {step} of 3</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Step 1: Scan QR Code */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Scan this QR code using Google Authenticator, Microsoft Authenticator, or 1Password to link your workspace account.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)]">
              {isLoading ? (
                <div className="w-44 h-44 rounded-lg bg-[var(--surface-secondary)] flex items-center justify-center border border-[var(--border-subtle)]">
                  <Loader2 size={24} className="animate-spin text-teal-500" />
                </div>
              ) : qrCode ? (
                <div className="p-2 bg-white rounded-xl shadow-sm shrink-0 border border-zinc-200">
                  <img src={qrCode} alt="2FA QR Code" className="w-40 h-40" />
                </div>
              ) : (
                <div className="w-44 h-44 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-500 text-xs">
                  QR Code Unavailable
                </div>
              )}

              <div className="flex-1 space-y-2 text-left">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Manual Entry Key
                </span>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono font-bold bg-[var(--surface-elevated)] px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] select-all break-all">
                    {secret || "Generating..."}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                    title="Copy Secret"
                  >
                    {copiedSecret ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                </div>
                {otpauthUri && (
                  <a
                    href={otpauthUri}
                    className="inline-block text-[11px] text-teal-600 dark:text-teal-400 hover:underline font-semibold mt-1"
                  >
                    Open in Authenticator App &rarr;
                  </a>
                )}
                <p className="text-[11px] text-[var(--text-muted)] leading-normal">
                  Type or paste this 32-character key into your authenticator app if unable to scan the QR code.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isLoading || !secret}
                onClick={() => setStep(2)}
                className="px-4 py-2 text-xs font-bold rounded-xl teal-button-primary shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                Next: Verify Code
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Verify 6-digit code */}
        {step === 2 && (
          <form onSubmit={handleConfirmVerification} className="space-y-4">
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Enter the 6-digit confirmation code generated by your authenticator app to finalize two-factor enrollment.
            </p>

            <div className="p-4 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)] space-y-3">
              <label className="text-xs font-semibold text-[var(--text-primary)]" htmlFor="verify-code">
                Authenticator Verification Code
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="verify-code"
                  type="text"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  autoFocus
                  className="w-full text-center tracking-[0.4em] font-mono text-lg font-bold py-2.5 px-3 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-xl focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                Back to QR Code
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || verifyCode.trim().length !== 6}
                  className="px-4 py-2 text-xs font-bold rounded-xl teal-button-primary shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : "Verify & Activate"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Step 3: Backup Codes Storage */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <Check size={16} className="shrink-0" />
              <span>Two-Factor Authentication is now active on your account!</span>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Save these single-use recovery backup codes immediately. If you lose access to your mobile authenticator device, each code can be used once to sign in.
            </p>

            <div className="p-4 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)] space-y-3">
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                {backupCodes.map((code, idx) => (
                  <div
                    key={idx}
                    className="p-1.5 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-lg text-center font-bold tracking-wider"
                  >
                    {code}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={handleCopyBackupCodes}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] hover:bg-[var(--surface-secondary)] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedBackupCodes ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  {copiedBackupCodes ? "Copied" : "Copy All Codes"}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadBackupCodes}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] hover:bg-[var(--surface-secondary)] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download size={13} />
                  Download .txt
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleFinish}
                className="px-5 py-2 text-xs font-bold rounded-xl teal-button-primary shadow-sm cursor-pointer"
              >
                I have saved my backup codes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
