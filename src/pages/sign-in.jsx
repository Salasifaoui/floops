import "../App.css";
import { useState } from "react";
import { OAuth2Provider, useEmailSignIn, useOAuth2SignIn } from "@src/packages/appwrite-client";

export default function SignInPage({ onBack, onGoSignUp }) {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const emailSignInMutation = useEmailSignIn({});
  const oauthMutation = useOAuth2SignIn();
  const isSubmitting = emailSignInMutation.isPending || oauthMutation.isPending;

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleEmailSignIn(event) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await emailSignInMutation.mutateAsync({
        email: form.email.trim(),
        password: form.password,
      });
      setSuccessMessage("Signed in successfully.");
      setTimeout(() => onBack?.(), 500);
    } catch (error) {
      const fallback = "Could not sign in. Please check your credentials.";
      setErrorMessage(error?.message || fallback);
    }
  }

  async function handleGoogleSignIn() {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const baseUrl = window.location.origin;
      await oauthMutation.mutateAsync({
        provider: OAuth2Provider.Google,
        success: `${baseUrl}/`,
        failure: `${baseUrl}/`,
      });
    } catch (error) {
      const fallback = "Google sign-in failed. Please try again.";
      setErrorMessage(error?.message || fallback);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-label="Sign in form">
        <p className="auth-card__eyebrow">Welcome back</p>
        <h1>Sign in</h1>
        <p className="auth-card__subtitle">
          Continue to your workspace using your email and password.
        </p>

        <form className="auth-form" onSubmit={handleEmailSignIn}>
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              required
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              required
            />
          </label>

          {errorMessage ? <p role="alert">{errorMessage}</p> : null}
          {successMessage ? <p>{successMessage}</p> : null}

          <button type="submit" className="auth-button auth-button--primary" disabled={isSubmitting}>
            {emailSignInMutation.isPending ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="auth-divider" role="presentation">
          <span>or</span>
        </div>

        <button
          type="button"
          className="auth-button auth-button--google"
          disabled={isSubmitting}
          onClick={handleGoogleSignIn}
        >
          {oauthMutation.isPending ? "Redirecting to Google..." : "Continue with Google"}
        </button>

        <div className="auth-card__links">
          <button type="button" className="auth-link" onClick={onGoSignUp}>
            Create new account
          </button>
          <button type="button" className="auth-link" onClick={onBack}>
            Back to services
          </button>
        </div>
      </section>
    </main>
  );
}
