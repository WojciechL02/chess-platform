import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useUserStore } from "../store/UserStore";

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

      const API_URL = import.meta.env.VITE_API_URL;
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
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Logo and Brand */}
        <div className="mb-8 flex flex-col items-center">
          <svg
            viewBox="0 0 100 100"
            className="w-16 h-16 fill-[#81b64c] mb-2"
          >
            <path d="M80,85H20c-2.8,0-5-2.2-5-5v-5h70v5C85,82.8,82.8,85,80,85z M75,70H25V55c0-13.8,11.2-25,25-25s25,11.2,25,25V70z M50,15 c5.5,0,10,4.5,10,10s-4.5,10-10,10s-10-4.5-10-10S44.5,15,50,15z" />
          </svg>
          <h1 className="text-3xl font-bold tracking-tight">ChessPlatform</h1>
        </div>

        <div className="w-full rounded-md bg-[#262421] p-8 shadow-2xl border border-[#403d39]">
          <h2 className="mb-6 text-xl font-bold text-center">Log In</h2>
          
          {error && (
            <div className="mb-4 rounded bg-red-500/10 border border-red-500/50 p-3 text-sm text-red-500 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full rounded bg-[#302e2b] border-[#403d39] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#81b64c] transition-all"
              />
            </div>
            <div>
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full rounded bg-[#302e2b] border-[#403d39] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#81b64c] transition-all"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-[#81b64c] py-3 font-bold text-white hover:bg-[#a3d160] transition-colors shadow-[0_0.25rem_0_#537131] active:translate-y-1 active:shadow-none"
            >
              {loading ? "Logging in..." : "Log In"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#403d39] text-center">
            <p className="text-sm text-[#bababa]">
              New to ChessPlatform?{" "}
              <Link to="/register" className="text-[#81b64c] font-bold hover:underline">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
