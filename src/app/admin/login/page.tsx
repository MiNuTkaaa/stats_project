"use client";

import { useState, useTransition } from "react";
import { signIn } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [oauthLoading, setOauthLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await signIn(email, password);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  async function handleGitHubLogin() {
    setError(null);
    setOauthLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/admin`,
      },
    });
    if (error) {
      setError(error.message);
      setOauthLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div className="card">
          <div className="card-title" style={{ textAlign: "center", fontSize: 20, marginBottom: 2 }}>
            Admin Login
          </div>
          <div className="card-underline" style={{ margin: "0 auto 8px" }} />
          <p style={{ color: "var(--text-2)", fontSize: 13, textAlign: "center", marginBottom: 24 }}>
            Sign in to manage game stats
          </p>

          {/* GitHub OAuth */}
          <button
            type="button"
            onClick={handleGitHubLogin}
            disabled={oauthLoading}
            style={{
              width: "100%",
              padding: "12px 20px",
              fontSize: 15,
              fontFamily: "var(--font-body)",
              fontWeight: 500,
              color: "#fff",
              background: "#24292f",
              border: "none",
              borderRadius: 14,
              cursor: oauthLoading ? "not-allowed" : "pointer",
              opacity: oauthLoading ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              transition: "opacity 0.15s",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            {oauthLoading ? "Redirecting..." : "Sign in with GitHub"}
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "1px" }}>or</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          {/* Email/Password */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label
                htmlFor="email"
                style={{ display: "block", fontSize: 9.5, textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--text-3)", marginBottom: 6, fontWeight: 500 }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="admin-input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                style={{ display: "block", fontSize: 9.5, textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--text-3)", marginBottom: 6, fontWeight: 500 }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="admin-input"
                placeholder="Enter password"
              />
            </div>

            {error && (
              <div style={{
                fontSize: 13,
                color: "var(--bad)",
                background: "rgba(198, 40, 40, 0.06)",
                border: "1px solid rgba(198, 40, 40, 0.2)",
                borderRadius: 10,
                padding: "10px 14px",
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="admin-btn"
              style={{
                width: "100%",
                padding: "12px 20px",
                fontSize: 15,
                opacity: isPending ? 0.5 : 1,
                cursor: isPending ? "not-allowed" : "pointer",
              }}
            >
              {isPending ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
