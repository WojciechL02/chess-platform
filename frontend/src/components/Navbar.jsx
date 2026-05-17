import { Link, useNavigate } from "react-router-dom";
import { useUserStore } from "../store/UserStore";

function BrandMark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="13" width="8.5" height="8.5" fill="currentColor" />
    </svg>
  );
}

export default function Navbar() {
  const token = useUserStore((state) => state.token);
  const clearUser = useUserStore((state) => state.clearUser);
  const navigate = useNavigate();

  const handleLogout = () => {
    clearUser();
    navigate("/");
  };

  return (
    <nav
      className="h-14 flex items-center px-6 fixed top-0 w-full z-50"
      style={{
        backgroundColor: "var(--bg)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-8 max-w-7xl mx-auto w-full">
        <Link
          to={token ? "/dashboard" : "/"}
          className="flex items-center gap-2.5"
          style={{ color: "var(--ink)" }}
        >
          <span style={{ color: "var(--accent)" }}>
            <BrandMark />
          </span>
          <span className="serif text-xl" style={{ letterSpacing: "-0.015em" }}>
            ChessPlatform
          </span>
        </Link>

        {token && (
          <div className="flex items-center gap-6">
            <Link
              to="/dashboard"
              className="text-sm font-medium hover:underline underline-offset-4"
              style={{ color: "var(--ink-soft)" }}
            >
              Play
            </Link>
            <Link
              to="/statistics"
              className="text-sm font-medium hover:underline underline-offset-4"
              style={{ color: "var(--ink-soft)" }}
            >
              Statistics
            </Link>
          </div>
        )}

        <div className="ml-auto flex items-center gap-5">
          {token ? (
            <button
              onClick={handleLogout}
              className="text-sm hover:underline underline-offset-4"
              style={{ color: "var(--ink-soft)", background: "transparent" }}
            >
              Sign out
            </button>
          ) : (
            <>
              <Link
                to="/"
                className="text-sm font-medium hover:underline underline-offset-4"
                style={{ color: "var(--ink-soft)" }}
              >
                Log in
              </Link>
              <Link to="/register" className="ed-btn ed-btn-primary text-sm" style={{ padding: "0.45rem 1rem" }}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
