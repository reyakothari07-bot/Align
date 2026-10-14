"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button } from "@/components/ui";
import { Field, Input } from "@/components/form";
import { Logo } from "@/components/logo";
import { errorMessage } from "@/lib/format";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const digits = phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  const fullPhone = `+91${digits}`;

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (digits.length !== 10) return setError("Please enter your 10-digit mobile number.");
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({ phone: fullPhone });
    setLoading(false);
    if (error) {
      if (error.code === "sms_send_failed") return setError("We couldn't send a code to this number right now. Please try again in a few minutes.");
      if (error.code === "over_sms_send_rate_limit" || error.status === 429) return setError("Too many codes requested. Please wait a minute and try again.");
      return setError(errorMessage(error));
    }
    setSent(true);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.verifyOtp({ phone: fullPhone, token: code.trim(), type: "sms" });
    if (error) {
      setLoading(false);
      return setError(error.message.includes("expired") || error.message.includes("invalid") ? "That code didn't work. Please check it and try again." : errorMessage(error));
    }
    router.replace("/onboarding");
    router.refresh();
  }

  async function google() {
    setError(null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(errorMessage(error));
  }

  return (
    <div className="flex min-h-full flex-1 flex-col items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex justify-center">
          <Logo />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{sent ? "Enter your code" : "Welcome to Align"}</h1>
        <p className="mt-1 text-sm text-muted">
          {sent ? `We sent a 6-digit code to +91 ${digits}.` : "Sign in or create an account with your phone number."}
        </p>

        <div className="mt-8 space-y-4">
          {error && <Alert>{error}</Alert>}

          {!sent ? (
            <form onSubmit={sendCode} className="space-y-4">
              <Field label="Mobile number" hint="Your number is never shown to brands or creators.">
                <div className="flex gap-2">
                  <span className="flex h-12 items-center rounded-2xl bg-white px-4 font-semibold ring-1 ring-inset ring-line">+91</span>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoFocus
                  />
                </div>
              </Field>
              <Button loading={loading}>Send code</Button>
            </form>
          ) : (
            <form onSubmit={verify} className="space-y-4">
              <Field label="6-digit code">
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="••••••"
                  className="text-center text-2xl font-bold tracking-[0.5em]"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  autoFocus
                />
              </Field>
              <Button loading={loading} disabled={code.length !== 6}>
                Verify and continue
              </Button>
              <Button type="button" variant="ghost" size="md" className="w-full" onClick={() => (setSent(false), setCode(""))}>
                Use a different number
              </Button>
            </form>
          )}

          {!sent && (
            <>
              <p className="text-center text-xs text-muted">
                By continuing, you agree to Align&apos;s{" "}
                <a href="/privacy" className="font-semibold text-brand-700 underline">
                  Privacy Policy
                </a>
                .
              </p>
              <div className="flex items-center gap-3 py-2 text-xs font-semibold text-muted">
                <span className="h-px flex-1 bg-line" />
                OR
                <span className="h-px flex-1 bg-line" />
              </div>
              <Button type="button" variant="secondary" onClick={google}>
                <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
                  <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h6a5.1 5.1 0 01-2.2 3.3v2.8h3.6c2.1-1.9 3.2-4.8 3.2-8.1z" />
                  <path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.9A11 11 0 0012 23z" />
                  <path fill="#FBBC05" d="M5.7 14c-.2-.7-.4-1.4-.4-2s.1-1.4.4-2V7.1H2A11 11 0 001 12c0 1.8.4 3.5 1.2 4.9L5.7 14z" />
                  <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0012 1 11 11 0 002 7.1L5.7 10c.9-2.6 3.4-4.6 6.3-4.6z" />
                </svg>
                Continue with Google
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
