import { Link, useNavigate } from "react-router-dom";
import { useUserStore } from "../store/UserStore";

export default function Navbar() {
  const token = useUserStore((state) => state.token);
  const clearUser = useUserStore((state) => state.clearUser);
  const user = useUserStore((state) => state.user);
  const navigate = useNavigate();

  const handleLogout = () => {
    clearUser();
    navigate("/");
  };

  return (
    <nav className="bg-[#262421] border-b border-[#403d39] h-14 flex items-center px-4 fixed top-0 w-full z-50">
      <div className="flex items-center space-x-6 max-w-7xl mx-auto w-full">
        {/* Logo */}
        <Link to={token ? "/dashboard" : "/"} className="flex items-center space-x-2">
          <svg
            viewBox="0 0 100 100"
            className="w-8 h-8 fill-[#81b64c]"
          >
            <path d="M80,85H20c-2.8,0-5-2.2-5-5v-5h70v5C85,82.8,82.8,85,80,85z M75,70H25V55c0-13.8,11.2-25,25-25s25,11.2,25,25V70z M50,15 c5.5,0,10,4.5,10,10s-4.5,10-10,10s-10-4.5-10-10S44.5,15,50,15z" />
          </svg>
          <span className="font-bold text-xl tracking-tight">ChessPlatform</span>
        </Link>

        {/* Links */}
        {token && (
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className="text-[#bababa] hover:text-white font-semibold transition-colors">Play</Link>
            <Link to="/statistics" className="text-[#bababa] hover:text-white font-semibold transition-colors">Stats</Link>
          </div>
        )}

        {/* Right side */}
        <div className="ml-auto flex items-center space-x-4">
          {token ? (
            <>
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-white leading-none">{user?.nickname}</span>
              </div>
              <button
                onClick={handleLogout}
                className="text-sm font-semibold text-[#bababa] hover:text-white transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/" className="text-sm font-semibold text-[#bababa] hover:text-white transition-colors">Login</Link>
              <Link to="/register" className="px-4 py-1.5 bg-[#81b64c] text-white font-bold rounded hover:bg-[#a3d160] transition-colors shadow-[0_0.2rem_0_#537131]">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
