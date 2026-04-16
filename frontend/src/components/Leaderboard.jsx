export default function Leaderboard({ players }) {
  return (
    <div className="bg-[#262421] rounded border border-[#403d39] overflow-hidden shadow-xl">
      <div className="px-6 py-4 border-b border-[#403d39] bg-[#21201d]">
        <h2 className="text-xl font-bold text-white flex items-center">
          <svg className="w-5 h-5 mr-2 text-[#81b64c]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.49 1.5 1.74 2.65 3.3 2.94L11 18H9v2h6v-2h-2l.31-4.12c1.56-.29 2.81-1.44 3.3-2.94C19.08 10.63 21 8.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
          </svg>
          Leaderboard
        </h2>
      </div>
      <div className="p-0">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#21201d]/50 text-[#bababa] text-[10px] font-black uppercase tracking-widest">
              <th className="py-3 px-6 w-16">Rank</th>
              <th className="py-3 px-6">Player</th>
              <th className="py-3 px-6 text-right">Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#403d39]">
            {players.length === 0 ? (
              <tr>
                <td colSpan="3" className="py-10 text-center text-[#bababa]">Searching for champions...</td>
              </tr>
            ) : (
              players.map((player, idx) => (
                <tr key={player.nickname || idx} className="hover:bg-[#3c3934] transition-colors group">
                  <td className="py-4 px-6">
                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-gray-300 text-black' : idx === 2 ? 'bg-amber-600 text-black' : 'text-[#bababa]'}`}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-semibold text-white group-hover:text-[#81b64c] transition-colors">
                    {player.nickname}
                  </td>
                  <td className="py-4 px-6 text-right text-[#81b64c] font-black tabular-nums">
                    {player.elo_rating}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
