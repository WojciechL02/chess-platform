export default function ProfileInfo({ user }) {
  return (
    <div className="flex items-center space-x-4">
      <div className="w-16 h-16 bg-[#302e2b] rounded-full flex items-center justify-center border-2 border-[#81b64c] shadow-inner">
        <span className="text-2xl font-bold text-[#81b64c] uppercase">
          {user.nickname?.charAt(0) || "?"}
        </span>
      </div>
      <div>
        <div className="flex items-center space-x-2">
          <h2 className="text-2xl font-black text-white leading-none">{user.nickname}</h2>
          <span className="bg-[#403d39] text-[#bababa] text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter">Pro</span>
        </div>
        <div className="flex items-center space-x-3 mt-1 text-[#bababa] text-sm font-semibold">
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 bg-[#81b64c] rounded-full"></span>
            <span>Online</span>
          </div>
          <div className="flex items-center space-x-1">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
               <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
            <span>Rating: <span className="text-white">{user.elo_rating || "1200"}</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
