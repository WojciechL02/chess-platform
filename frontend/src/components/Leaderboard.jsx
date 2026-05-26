export default function Leaderboard({ players }) {
  return (
    <div className="ed-card overflow-hidden">
      <div className="px-6 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="ed-eyebrow mb-1">Top Players</div>
        <h2 className="serif text-2xl" style={{ color: "var(--ink)" }}>
          Leaderboard
        </h2>
      </div>
      <div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th
                className="py-3 px-6 text-xs font-medium"
                style={{ color: "var(--muted)", width: "3.5rem" }}
              >
                #
              </th>
              <th className="py-3 px-6 text-xs font-medium" style={{ color: "var(--muted)" }}>
                Player
              </th>
              <th
                className="py-3 px-6 text-xs font-medium text-right"
                style={{ color: "var(--muted)" }}
              >
                Rating
              </th>
            </tr>
          </thead>
          <tbody>
            {players.length === 0 ? (
              <tr>
                <td
                  colSpan="3"
                  className="py-12 text-center text-sm"
                  style={{ color: "var(--muted)" }}
                >
                  No players ranked yet.
                </td>
              </tr>
            ) : (
              players.map((player, idx) => (
                <tr
                  key={player.nickname || idx}
                  style={{ borderTop: "1px solid var(--border)" }}
                  className="hover:[background-color:var(--surface-sunk)] transition-colors"
                >
                  <td
                    className="py-3.5 px-6 text-sm"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: idx < 3 ? "var(--accent)" : "var(--muted)",
                      fontWeight: idx < 3 ? 600 : 500,
                    }}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </td>
                  <td
                    className="py-3.5 px-6 text-sm"
                    style={{ color: "var(--ink)", fontWeight: 500 }}
                  >
                    {player.nickname}
                  </td>
                  <td
                    className="py-3.5 px-6 text-right text-sm"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--ink)",
                      fontWeight: 600,
                    }}
                  >
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
