import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useUserStore } from "../store/UserStore";

export default function Register() {
  const [form, setForm] = useState({ email: "", password: "", nickname: "" });
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
      const API_URL = import.meta.env.VITE_API_URL;
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          nickname: form.nickname,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        // fastapi-users often returns errors in a specific format
        const errorMsg = errData.detail || errData.message || "Registration failed";
        throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
      }

      // Automatically login after registration if desired, 
      // but usually register only returns user data.
      // Let's try to login automatically.
      
      const formData = new URLSearchParams();
      formData.append("username", form.email);
      formData.append("password", form.password);

      const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });

      if (loginRes.ok) {
        const loginData = await loginRes.json();
        if (loginData.access_token) setToken(loginData.access_token);
        navigate("/dashboard");
      } else {
        navigate("/");
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-2xl font-bold text-center">Sign Up</h1>
        {error && <p className="mb-4 text-center text-sm text-red-600">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="nickname"
            placeholder="Nickname"
            value={form.nickname}
            onChange={handleChange}
            required
            className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading ? "Registering..." : "Sign Up"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link to="/" className="text-blue-600 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
