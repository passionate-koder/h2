"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {useRouter} from 'next/navigation';
import {useAccount} from '@/components/account-provider';
export function AuthForm({
  initialMode = "signin",
  authMode = "local",
  initialMessage = "",
}: {
  initialMode?: "signin" | "signup" | "reset" | "verify" | "update-password";
  authMode?: "local" | "supabase";
  initialMessage?: string;
}) {
  const [mode, setMode] = useState(initialMode);
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [loading, setLoading] = useState(false);
  const router=useRouter();const account=useAccount();
  function switchMode(next: typeof mode) {
    setMode(next);
    setMessage("");
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode,
          ...Object.fromEntries(new FormData(e.currentTarget)),
        }),
      });
      const data = await res.json();
      if(res.ok&&data.user){account.setUser(data.user);const destination=new URLSearchParams(window.location.search).get('redirect');router.push(destination?.startsWith('/')&&!destination.startsWith('//')&&!/[\\\s]/.test(destination)?destination:'/programs');router.refresh();return;}
      setMessage(data.message);
    } catch {
      setMessage("Unable to connect. Please try again later.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="hc-auth-grid" id="page-content">
      <div className="hc-auth-card">
        {mode === "signup" && (
          <button onClick={() => switchMode("signin")} className="hc-auth-back">
            <ArrowLeft size={16} />
            Back to Login
          </button>
        )}
        <h1>
          {mode === "signin"
            ? "Welcome Back"
            : mode === "signup"
              ? "Join the Innovation"
              : mode === "verify" ? "Verify your email" : mode === "update-password" ? "Choose a new password" : "Reset password"}
        </h1>
        <p className="hc-auth-subtitle">
          {mode === "signin"
            ? "Sign in to access your Buildora account"
            : mode === "signup"
              ? "Create your account to unlock new opportunities"
              : mode === "verify" ? "Request a new verification email" : mode === "update-password" ? "Enter a new password for your account" : "Enter your email to receive a password reset link"}
        </p>
        <p className="hc-auth-subtitle">{authMode === "local" ? "Local development accounts. Cloud persistence and email delivery are unavailable." : "Your account is stored securely with Supabase."}</p>
        <form onSubmit={submit}>
          {mode === "signup" && (
            <div className="hc-field">
              <label htmlFor="fullname">Full Name</label>
              <input
                id="fullname"
                name="name"
                autoComplete="name"
                placeholder="John Doe"
                required
              />
            </div>
          )}
          {mode !== "update-password" && <div className="hc-field">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="email@example.com"
              required
            />
          </div>}
          {(mode === "signin" || mode === "signup" || mode === "update-password") && (
            <div className="hc-field">
              <label htmlFor="password">Password</label>
              <div className="hc-password">
                <input
                  id="password"
                  name="password"
                  type={show ? "text" : "password"}
                  autoComplete={
                    (mode === "signup" || mode === "update-password") ? "new-password" : "current-password"
                  }
                  placeholder="**********"
                  required
                  minLength={mode === "signin" ? 1 : 8}
                />
                <button
                  type="button"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
          )}
          {mode === "reset" && (
            <p className="text-sm text-gray-500 mb-5">
              {authMode === 'supabase' ? 'Use the secure link in your recovery email to choose a new password.' : 'Password recovery requires cloud email delivery.'}
            </p>
          )}
          <Button className="hc-auth-submit" type="submit" disabled={loading}>
            {loading
              ? "Please wait…"
              : mode === "signin"
                ? "Sign In"
                : mode === "signup"
                  ? "Create Account"
                  : mode === "verify" ? "Send Verification Email" : mode === "update-password" ? "Update Password" : "Send Reset Link"}
          </Button>
        </form>
        {message && (
          <p role="status" className="hc-form-message">
            {message}
          </p>
        )}
        {mode === "signin" && (
          <div className="hc-auth-links">
            <Link href="/auth/reset-password">Forgot Password?</Link>
            {authMode === "supabase" && <Link href="/auth/verify">Resend verification</Link>}
            <span>
              Don&apos;t have an account?{" "}
              <button onClick={() => switchMode("signup")}>Sign Up</button>
            </span>
          </div>
        )}
        {(mode === "reset" || mode === "verify" || mode === "update-password") && (
          <div className="hc-auth-links justify-center">
            <Link href="/auth">Back to Login</Link>
          </div>
        )}
      </div>
    </main>
  );
}
