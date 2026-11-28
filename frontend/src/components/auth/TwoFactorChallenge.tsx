"use client";

import React, { useState, useRef, useEffect } from "react";
import { ShieldCheck, KeyRound, ArrowRight, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { verify2faChallenge } from "@/app/actions/auth";

interface TwoFactorChallengeProps {
  ticket: string;
  email: string;
  redirectTo?: string;
  onSuccess: (targetUrl?: string) => void;
  onCancel: () => void;
}

export function TwoFactorChallenge({
  ticket,
  email,
  redirectTo,
  onSuccess,
  onCancel,
}: TwoFactorChallengeProps) {
  const [isBackupMode, setIsBackupMode] = useState(false);
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [backupCode, setBackupCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!isBackupMode && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [isBackupMode]);

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric inputs
    const lastChar = value.slice(-1);
    if (value && !/^\d$/.test(lastChar)) return;

    const newDigits = [...digits];
    newDigits[index] = lastChar;
    setDigits(newDigits);
    setErrorMessage(null);

    // Auto-advance to next input
    if (lastChar && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are provided
    if (lastChar && index === 5 && newDigits.every((d) => d !== "")) {
      executeVerification(newDigits.join(""), false);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0 && inputRefs.current[index - 1]) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(pasted)) {
      const splitDigits = pasted.split("");
      setDigits(splitDigits);
      if (inputRefs.current[5]) {
        inputRefs.current[5].focus();
      }
      executeVerification(pasted, false);
    }
  };

  const executeVerification = async (codeStr: string, isBackup: boolean) => {
    if (!codeStr || isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await verify2faChallenge(ticket, codeStr, isBackup, redirectTo);
      if (!res.success) {
        setErrorMessage(res.error || "Verification failed. Check the code and try again.");
        setIsLoading(false);
      } else {
        onSuccess(res.redirectTo);
      }
    } catch {
      setErrorMessage("An unexpected error occurred during two-factor verification.");
      setIsLoading(false);
    }
  };

  const handleBackupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupCode.trim()) return;
    executeVerification(backupCode.trim(), true);
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex flex-col items-center text-center gap-2">
        <div className="w-12 h-12 rounded-2xl bg-[var(--accent-soft-alpha)] border border-[var(--accent-primary)]/30 flex items-center justify-center text-[var(--accent-primary)] shadow-sm">
          {isBackupMode ? <KeyRound size={22} /> : <ShieldCheck size={22} />}
        </div>
        <h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
          {isBackupMode ? "Recovery Backup Code" : "Two-Factor Verification"}
        </h3>
        <p className="text-xs text-[var(--text-secondary)] max-w-xs leading-relaxed">
          {isBackupMode
            ? `Enter one of your 8-character single-use recovery codes for ${email}`
            : `Enter the 6-digit verification code from your Google Authenticator app for ${email}`}
        </p>
      </div>

      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {!isBackupMode ? (
        <div className="flex flex-col gap-5">
          {/* 6 Digit Input Boxes */}
          <div className="flex justify-between gap-2 sm:gap-2.5">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                disabled={isLoading}
                className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-black font-mono bg-[var(--surface-secondary)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20 rounded-xl text-[var(--text-primary)] transition-all outline-none disabled:opacity-60"
                aria-label={`Digit ${index + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => executeVerification(digits.join(""), false)}
            disabled={isLoading || digits.some((d) => d === "")}
            className="w-full py-3 px-4 teal-button-primary rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Verifying Identity...</span>
              </>
            ) : (
              <>
                <span>Confirm &amp; Access Console</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>
      ) : (
        <form onSubmit={handleBackupSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-primary)]" htmlFor="backup-code">
              Backup Recovery Code
            </label>
            <input
              id="backup-code"
              type="text"
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX"
              disabled={isLoading}
              maxLength={10}
              className="w-full px-3.5 py-2.5 bg-[var(--surface-secondary)] border border-[var(--border-subtle)] rounded-xl text-center text-sm font-mono tracking-widest text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]/30 transition-all uppercase"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !backupCode.trim()}
            className="w-full py-3 px-4 teal-button-primary rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Verifying Backup Code...</span>
              </>
            ) : (
              <>
                <span>Redeem Code &amp; Continue</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>
      )}

      {/* Mode Switch & Cancel */}
      <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]/60 text-center">
        <button
          type="button"
          onClick={() => {
            setIsBackupMode(!isBackupMode);
            setErrorMessage(null);
          }}
          disabled={isLoading}
          className="text-xs text-[var(--accent-primary)] hover:underline font-semibold cursor-pointer disabled:opacity-50"
        >
          {isBackupMode ? "Use 6-digit authenticator code instead" : "Lost access to your app? Use a recovery backup code"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 mt-1"
        >
          <ArrowLeft size={13} />
          <span>Cancel and return to sign in</span>
        </button>
      </div>
    </div>
  );
}
