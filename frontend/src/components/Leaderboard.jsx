export default function Leaderboard({ players }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <h2 className="text-xl font-bold mb-4">Leaderboard</h2>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b">
            <th className="py-2 px-4">Rank</th>
            <th className="py-2 px-4">Player</th>
            <th className="py-2 px-4">Rating</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, idx) => (
            <tr key={player.nickname || idx} className="border-b hover:bg-gray-50">
              <td className="py-2 px-4">{idx + 1}</td>
              <td className="py-2 px-4">{player.nickname}</td>
              <td className="py-2 px-4">{player.elo_rating}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
