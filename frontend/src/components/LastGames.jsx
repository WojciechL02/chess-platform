export default function LastGames({ games }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <h2 className="text-xl font-bold mb-4">Last Games</h2>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b">
            <th className="py-2 px-4">Opponent</th>
            <th className="py-2 px-4">Result</th>
            <th className="py-2 px-4">Date</th>
          </tr>
        </thead>
        <tbody>
          {games.map((game, idx) => (
            <tr key={idx} className="border-b hover:bg-gray-50">
              <td className="py-2 px-4">{game.opponent}</td>
              <td className="py-2 px-4">{game.result}</td>
              <td className="py-2 px-4">{new Date(game.date).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
