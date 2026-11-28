"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Smartphone,
  Globe,
  RefreshCw,
  LogOut,
  AlertCircle,
  Loader2,
  Shield,
  Laptop,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { fetchActiveSessionsAction, revokeSessionAction, SessionItem } from "@/app/actions/auth";

export function ActiveSessionsCard() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetchActiveSessionsAction();
      if (!res.success) {
        setErrorMessage(res.error || "Failed to load active sessions.");
      } else {
        setSessions(res.sessions || []);
      }
    } catch {
      setErrorMessage("Could not connect to session manager.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleRevoke = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      const res = await revokeSessionAction(sessionId);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to revoke session.");
      } else {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      }
    } catch {
      setErrorMessage("Network error while revoking session.");
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllOthers = async () => {
    setRevokingAll(true);
    try {
      const res = await revokeSessionAction(undefined, true);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to revoke other sessions.");
      } else {
        await loadSessions();
      }
    } catch {
      setErrorMessage("Network error while revoking other sessions.");
    } finally {
      setRevokingAll(false);
    }
  };

  const getDeviceIcon = (deviceType?: string) => {
    const dt = deviceType?.toLowerCase() || "";
    if (dt.includes("mobile") || dt.includes("phone")) {
      return <Smartphone size={16} className="text-teal-500" />;
    }
    if (dt.includes("mac") || dt.includes("windows") || dt.includes("desktop")) {
      return <Laptop size={16} className="text-teal-500" />;
    }
    return <Globe size={16} className="text-teal-500" />;
  };

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Shield size={18} />
            </div>
            <div>
              <CardTitle>Active Workspace Sessions</CardTitle>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Inspect and manage all authorized browser and desktop client sessions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadSessions}
              disabled={isLoading}
              className="p-1.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Sessions"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            </button>
            {sessions.length > 1 && (
              <button
                type="button"
                onClick={handleRevokeAllOthers}
                disabled={revokingAll}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {revokingAll ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />}
                Revoke Others
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-xs">
        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isLoading ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-2">
            <Loader2 size={20} className="animate-spin text-teal-500" />
            <span className="text-xs text-[var(--text-secondary)]">Enumerating authenticated sessions...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-4 rounded-xl bg-[var(--surface-secondary)]/30 border border-[var(--border-subtle)] text-center text-xs text-[var(--text-secondary)]">
            No active remote sessions recorded. Current session is managed locally.
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((sess, idx) => (
              <div
                key={sess.id}
                className="p-3 rounded-xl bg-[var(--surface-secondary)]/50 border border-[var(--border-subtle)] flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                    {getDeviceIcon(sess.device_type || sess.user_agent)}
                  </div>
                  <div>
                    <div className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                      <span>{sess.device_type || "Web Browser"}</span>
                      {idx === 0 && (
                        <span className="text-[10px] bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30 font-bold px-1.5 py-0.2 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] font-mono flex items-center gap-2 mt-0.5">
                      <span>IP: {sess.ip_address || "127.0.0.1"}</span>
                      {sess.last_active && (
                        <>
                          <span>•</span>
                          <span>Last active: {new Date(sess.last_active).toLocaleString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {idx !== 0 && (
                  <button
                    type="button"
                    onClick={() => handleRevoke(sess.id)}
                    disabled={revokingId === sess.id}
                    className="px-2.5 py-1 text-xs rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-red-500 hover:border-red-500/30 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                  >
                    {revokingId === sess.id ? <Loader2 size={12} className="animate-spin" /> : "Revoke"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
