"use client";

import { FormEvent, useState } from "react";
import { apiPost, getToken, setSession, type AuthUser } from "@/lib/api";
import { useConfirm } from "@/components/portal/ConfirmDialog";

type SetupPayload = {
  secret: string;
  otpauthUrl: string;
  qrDataUrl: string;
  message: string;
};

export function MfaSettings({
  user,
  onUserChange,
}: {
  user: AuthUser;
  onUserChange: (u: AuthUser) => void;
}) {
  const { confirm, dialog } = useConfirm();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [setup, setSetup] = useState<SetupPayload | null>(null);
  const [code, setCode] = useState("");
  const [disableOpen, setDisableOpen] = useState(false);
  const [disableCode, setDisableCode] = useState("");

  function syncSession(u: AuthUser) {
    onUserChange(u);
    const token = getToken();
    if (token) setSession(token, u);
  }

  async function startSetup() {
    const ok = await confirm({
      title: "Set up Google Authenticator?",
      message:
        "You will scan a QR code with Google Authenticator, then enter a 6-digit code to finish enabling MFA.",
      confirmLabel: "Continue",
      cancelLabel: "Cancel",
    });
    if (!ok) return;

    setBusy(true);
    setErr("");
    setMsg("");
    setSetup(null);
    setCode("");
    try {
      const res = await apiPost<SetupPayload>("/api/auth/me/mfa/setup", {});
      setSetup(res);
      setMsg(res.message);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start MFA setup");
    } finally {
      setBusy(false);
    }
  }

  async function confirmSetup(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const res = await apiPost<{ user: AuthUser; message: string }>("/api/auth/me/mfa/confirm", {
        code: code.trim(),
      });
      syncSession(res.user);
      setSetup(null);
      setCode("");
      setMsg(res.message);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not confirm MFA");
    } finally {
      setBusy(false);
    }
  }

  async function disableMfa(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const res = await apiPost<{ user: AuthUser; message: string }>("/api/auth/me/mfa/disable", {
        code: disableCode.trim(),
      });
      syncSession(res.user);
      setDisableOpen(false);
      setDisableCode("");
      setSetup(null);
      setMsg(res.message);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not disable MFA");
    } finally {
      setBusy(false);
    }
  }

  function cancelSetup() {
    setSetup(null);
    setCode("");
    setMsg("Setup cancelled. MFA stays disabled until you complete the Google Authenticator steps.");
  }

  return (
    <section className="border border-[#e8a914]/25 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(250,246,235,0.95))] p-4 shadow-[0_14px_32px_-24px_rgba(26,24,20,0.35)] sm:p-5">
      {dialog}
      <div className="mb-2 flex items-center gap-3">
        <span className="h-8 w-1 bg-gradient-to-b from-[#1a1814] to-[#e8a914]" aria-hidden />
        <h2 className="font-display text-lg font-black uppercase italic text-[#1a1814]">
          Google Authenticator (MFA)
        </h2>
      </div>

      <p className="text-sm text-[#555]">
        Protect your account with Google Authenticator. After email OTP, you will also enter a
        6-digit code from the app.
      </p>

      <p className="mt-3 text-sm font-semibold text-[#1a1814]">
        Status:{" "}
        <span
          className={
            user.mfaEnabled
              ? "inline-block border border-[#e8a914]/40 bg-[#faf6eb] px-2 py-0.5 text-[#1a1814]"
              : "inline-block border border-black/10 bg-[#f7f4f2] px-2 py-0.5 text-[#555]"
          }
        >
          {user.mfaEnabled ? "Enabled" : "Disabled"}
        </span>
      </p>

      {msg && <p className="mt-2 text-xs font-medium text-[var(--brand-gold-dark)]">{msg}</p>}
      {err && <p className="mt-2 text-xs font-medium text-red-700">{err}</p>}

      {!user.mfaEnabled && !setup && (
        <button
          type="button"
          className="btn-primary mt-4"
          disabled={busy}
          onClick={() => void startSetup()}
        >
          {busy ? "Preparing…" : "Enable Google Authenticator"}
        </button>
      )}

      {setup && (
        <div className="mt-5 space-y-4 border border-black/10 bg-white p-4">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-[#444]">
            <li>
              Install <strong>Google Authenticator</strong> on your phone (iOS or Android).
            </li>
            <li>Open the app → tap <strong>+</strong> → <strong>Scan a QR code</strong>.</li>
            <li>Scan the QR below (or type the manual key if you cannot scan).</li>
            <li>Enter the 6-digit code shown in Google Authenticator to finish.</li>
          </ol>

          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={setup.qrDataUrl}
              alt="Google Authenticator QR code"
              className="h-[220px] w-[220px] border border-black/10 bg-white p-2"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#888]">
                Manual entry key (Google Authenticator)
              </p>
              <p className="mt-1 break-all font-mono text-sm font-semibold tracking-wide text-[#1a1814]">
                {setup.secret}
              </p>
              <p className="mt-2 text-xs text-[#666]">
                Keep this key private. Anyone with it can generate your login codes.
              </p>
            </div>
          </div>

          <form onSubmit={confirmSetup} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="label" htmlFor="mfa-confirm-code">
                Google Authenticator code
              </label>
              <input
                id="mfa-confirm-code"
                className="input-field mt-1 w-40 font-mono tracking-[0.2em]"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={busy || code.length < 6}>
              {busy ? "Confirming…" : "Confirm & enable"}
            </button>
            <button type="button" className="btn-ghost" disabled={busy} onClick={cancelSetup}>
              Cancel
            </button>
          </form>
        </div>
      )}

      {user.mfaEnabled && !disableOpen && (
        <button
          type="button"
          className="btn-secondary mt-4"
          disabled={busy}
          onClick={() => {
            setDisableOpen(true);
            setErr("");
            setMsg("");
          }}
        >
          Disable Google Authenticator
        </button>
      )}

      {user.mfaEnabled && disableOpen && (
        <form
          onSubmit={disableMfa}
          className="mt-4 flex flex-wrap items-end gap-3 border border-red-200 bg-red-50/60 p-4"
        >
          <div>
            <label className="label" htmlFor="mfa-disable-code">
              Enter current Google Authenticator code to disable
            </label>
            <input
              id="mfa-disable-code"
              className="input-field mt-1 w-40 font-mono tracking-[0.2em]"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              placeholder="000000"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={busy || disableCode.length < 6}>
            {busy ? "Disabling…" : "Confirm disable"}
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={busy}
            onClick={() => {
              setDisableOpen(false);
              setDisableCode("");
            }}
          >
            Cancel
          </button>
        </form>
      )}
    </section>
  );
}
