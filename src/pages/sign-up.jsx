import "../App.css";
import { useState } from "react";
import { useEmailSignIn, useEmailSignUp } from "@src/packages/appwrite-client";

export default function SignUpPage({ onBack, onGoSignIn }) {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const signUpMutation = useEmailSignUp({});
  const signInMutation = useEmailSignIn({});

  const isSubmitting = signUpMutation.isPending || signInMutation.isPending;

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await signUpMutation.mutateAsync({
        name: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      await signInMutation.mutateAsync({
        email: form.email.trim(),
        password: form.password,
      });

      setSuccessMessage("Account created successfully. You are now signed in.");
      setTimeout(() => onBack?.(), 500);
    } catch (error) {
      const fallback = "Could not create your account. Please try again.";
      setErrorMessage(error?.message || fallback);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-label="Sign up form">
        <p className="auth-card__eyebrow">Get started</p>
        <h1>Sign up</h1>
        <p className="auth-card__subtitle">
          Create your account with a username, email, and password.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Username</span>
            <input
              type="text"
              name="username"
              placeholder="Enter username"
              autoComplete="username"
              value={form.username}
              onChange={(event) => updateField("username", event.target.value)}
              required
            />
          </label>

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
              placeholder="Create a password"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              required
            />
          </label>

          {errorMessage ? <p role="alert">{errorMessage}</p> : null}
          {successMessage ? <p>{successMessage}</p> : null}

          <button type="submit" className="auth-button auth-button--primary" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="auth-card__links">
          <button type="button" className="auth-link" onClick={onGoSignIn}>
            Already have an account? Sign in
          </button>
          <button type="button" className="auth-link" onClick={onBack}>
            Back to services
          </button>
        </div>
      </section>
    </main>
  );
}
