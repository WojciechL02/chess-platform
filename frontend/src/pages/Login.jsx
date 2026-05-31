import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useUserStore } from "../store/UserStore";
import { API_URL } from "../config";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setToken = useUserStore((state) => state.setToken);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new URLSearchParams();
      formData.append("username", form.email);
      formData.append("password", form.password);

      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Login failed");
      }

      const data = await res.json();
      if (data.access_token) setToken(data.access_token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="ed-eyebrow mb-3">Welcome back</div>
          <h1 className="serif text-4xl" style={{ color: "var(--ink)" }}>
            Sign in to play
          </h1>
        </div>

        <div className="ed-card p-10">
          {error && (
            <div
              className="mb-5 p-3 text-sm text-center"
              style={{
                backgroundColor: "var(--accent-soft)",
                color: "var(--negative)",
                border: "1px solid var(--negative)",
                borderRadius: 2,
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs mb-1.5"
                style={{ color: "var(--muted)", fontWeight: 600 }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5"
                style={{ borderRadius: 2 }}
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-xs mb-1.5"
                style={{ color: "var(--muted)", fontWeight: 600 }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5"
                style={{ borderRadius: 2 }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="ed-btn ed-btn-primary w-full mt-6"
              style={{ padding: "0.75rem 1.25rem" }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <hr className="ed-rule my-7" />

          <p className="text-sm text-center" style={{ color: "var(--muted)" }}>
            New here?{" "}
            <Link
              to="/register"
              className="underline underline-offset-4"
              style={{ color: "var(--accent)", fontWeight: 500 }}
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
