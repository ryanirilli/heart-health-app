"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Activity, Mail, ArrowLeft, RotateCw, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showResendForm, setShowResendForm] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Handle error from URL params (e.g., expired link)
  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) {
      setError(urlError);
      // If it's an expired link error, show the resend option
      if (urlError.toLowerCase().includes("expired")) {
        setShowResendForm(true);
      }
    }
  }, [searchParams]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  const handleResendEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    
    setResendLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
        },
      });
      if (error) throw error;
      setResendCooldown(60); // 60 second cooldown
      setResendSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend email");
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackToSignUp = () => {
    setConfirmationSent(false);
    setEmail("");
    setPassword("");
    setError(null);
  };

  const handleBackToLogin = () => {
    setShowResendForm(false);
    setShowForgotPassword(false);
    setResendSuccess(false);
    setResetEmailSent(false);
    setEmail("");
    setError(null);
    // Clear URL params
    router.replace("/login");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery&next=/reset-password`,
      });
      if (error) throw error;
      setResetEmailSent(true);
      setResendCooldown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
          },
        });
        if (error) throw error;
        setConfirmationSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Confirmation email sent screen
  if (confirmationSent) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          {/* Mail Icon */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-chart-2/10">
              <Mail className="h-8 w-8 text-chart-2" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">Check your inbox</h1>
            <p className="text-muted-foreground text-center">
              We sent a confirmation link to
            </p>
            <p className="font-medium text-foreground">{email}</p>
          </div>

          {/* Instructions */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              Click the link in the email to activate your account. If you don&apos;t see it, check your spam folder.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              size="pill-lg"
              onClick={handleResendEmail}
              disabled={resendLoading || resendCooldown > 0}
              className="w-full"
            >
              <RotateCw className={`h-4 w-4 ${resendLoading ? "animate-spin" : ""}`} />
              {resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : resendLoading
                  ? "Sending..."
                  : "Resend email"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="pill-lg"
              onClick={handleBackToSignUp}
              className="w-full text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Use a different email
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Forgot password screen
  if (showForgotPassword) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          {/* Icon */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-chart-2/10">
              {resetEmailSent ? (
                <Mail className="h-8 w-8 text-chart-2" />
              ) : (
                <KeyRound className="h-8 w-8 text-chart-2" />
              )}
            </div>
            <h1 className="text-2xl font-semibold text-foreground">
              {resetEmailSent ? "Check your inbox" : "Reset password"}
            </h1>
            <p className="text-muted-foreground text-center">
              {resetEmailSent
                ? "We sent a password reset link to"
                : "Enter your email and we'll send you a reset link"}
            </p>
            {resetEmailSent && email && (
              <p className="font-medium text-foreground">{email}</p>
            )}
          </div>

          {!resetEmailSent && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                size="pill-lg"
                disabled={loading}
                className="w-full"
              >
                <Mail className="h-4 w-4" />
                {loading ? "Sending..." : "Send reset link"}
              </Button>
            </form>
          )}

          {resetEmailSent && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-sm text-muted-foreground text-center">
                  Click the link in the email to reset your password. If you don&apos;t see it, check your spam folder.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="pill-lg"
                onClick={handleForgotPassword}
                disabled={loading || resendCooldown > 0}
                className="w-full"
              >
                <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : loading
                    ? "Sending..."
                    : "Resend email"}
              </Button>
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            size="pill-lg"
            onClick={handleBackToLogin}
            className="w-full text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Button>
        </div>
      </main>
    );
  }

  // Request new confirmation link screen (for expired links)
  if (showResendForm) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          {/* Icon */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10">
              <RotateCw className="h-8 w-8 text-amber-500" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">
              {resendSuccess ? "Check your inbox" : "Link expired"}
            </h1>
            <p className="text-muted-foreground text-center">
              {resendSuccess
                ? "We sent a new confirmation link to"
                : "Enter your email to receive a new confirmation link"}
            </p>
            {resendSuccess && email && (
              <p className="font-medium text-foreground">{email}</p>
            )}
          </div>

          {!resendSuccess && (
            <form onSubmit={handleResendEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resend-email">Email</Label>
                <Input
                  id="resend-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                size="pill-lg"
                disabled={resendLoading || resendCooldown > 0}
                className="w-full"
              >
                <Mail className="h-4 w-4" />
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : resendLoading
                    ? "Sending..."
                    : "Send new link"}
              </Button>
            </form>
          )}

          {resendSuccess && (
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-sm text-muted-foreground text-center">
                Click the link in the email to activate your account. If you don&apos;t see it, check your spam folder.
              </p>
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            size="pill-lg"
            onClick={handleBackToLogin}
            className="w-full text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-chart-1/20">
            <Activity className="h-7 w-7 text-chart-1" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Rhythm</h1>
          <p className="text-muted-foreground text-center">
            {isSignUp
              ? "Create an account to start tracking"
              : "Track anything you want simply"}
          </p>
        </div>

        {/* Google Sign In */}
        <Button
          type="button"
          variant="outline"
          size="pill-lg"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="w-full"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
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
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {googleLoading ? "Connecting..." : "Continue with Google"}
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-input"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              or continue with email
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {!isSignUp && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setError(null);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground px-0 h-auto"
                >
                  Forgot password?
                </Button>
              )}
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
              {error}
            </div>
          )}

          <Button
            type="submit"
            size="pill-lg"
            disabled={loading}
            className="w-full"
          >
            {loading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
          </Button>
        </form>

        {/* Toggle */}
        <div className="text-center">
          <Button
            type="button"
            variant="muted"
            size="sm"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "Don't have an account? Sign up"}
          </Button>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-14 h-14 rounded-2xl bg-chart-1/20 animate-pulse" />
      </main>
    }>
      <LoginContent />
    </Suspense>
  );
}
