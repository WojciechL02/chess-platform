import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useUserStore } from "../store/UserStore";
import Leaderboard from "../components/Leaderboard";
import ProfileInfo from "../components/ProfileInfo";
import { API_URL, WS_URL } from "../config";

function ResultBadge({ game, currentUserId }) {
  if (game.status !== "finished") {
    return (
      <span
        className="inline-block px-2 py-0.5 text-xs"
        style={{
          border: "1px solid var(--accent)",
          color: "var(--accent)",
          borderRadius: 2,
          fontWeight: 500,
        }}
      >
        Pending
      </span>
    );
  }

  if (!game.winner_id) {
    return (
      <span
        className="inline-block px-2 py-0.5 text-xs"
        style={{
          border: "1px solid var(--border-strong)",
          color: "var(--muted)",
          borderRadius: 2,
          fontWeight: 500,
        }}
      >
        Draw
      </span>
    );
  }

  const isWin = game.winner_id === currentUserId;
  const color = isWin ? "var(--positive)" : "var(--negative)";
  const label = isWin ? "Win" : "Loss";

  return (
    <span
      className="inline-block px-2 py-0.5 text-xs"
      style={{
        border: `1px solid ${color}`,
        color: color,
        borderRadius: 2,
        fontWeight: 500,
      }}
    >
      {label}
    </span>
  );
}

function GameHistoryTable({ games, currentUserId }) {
  return (
    <div className="ed-card overflow-hidden">
      <div className="px-6 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="ed-eyebrow mb-1">History</div>
        <h2 className="serif text-2xl" style={{ color: "var(--ink)" }}>
          Recent games
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium" style={{ color: "var(--muted)" }}>Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium" style={{ color: "var(--muted)" }}>Players</th>
              <th className="px-6 py-3 text-left text-xs font-medium" style={{ color: "var(--muted)" }}>Format</th>
              <th className="px-6 py-3 text-left text-xs font-medium" style={{ color: "var(--muted)" }}>Result</th>
              <th className="px-6 py-3 text-left text-xs font-medium" style={{ color: "var(--muted)" }}></th>
            </tr>
          </thead>
          <tbody>
            {games.length === 0 ? (
              <tr>
                <td
                  colSpan="5"
                  className="px-6 py-12 text-center text-sm"
                  style={{ color: "var(--muted)" }}
                >
                  No games yet. Play your first match above.
                </td>
              </tr>
            ) : (
              games.map((game) => (
                <tr
                  key={game.id}
                  style={{ borderTop: "1px solid var(--border)" }}
                  className="hover:[background-color:var(--surface-sunk)] transition-colors"
                >
                  <td
                    className="px-6 py-3.5 whitespace-nowrap text-sm"
                    style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
                  >
                    {new Date(game.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-sm" style={{ color: "var(--ink)" }}>
                    <span style={{ fontWeight: game.white_id === currentUserId ? 600 : 500 }}>
                      {game.white_id === currentUserId && (
                        <span 
                          title="Played as White"
                          style={{ 
                            display: 'inline-block', width: 9, height: 9, 
                            border: '1px solid var(--border-strong)', 
                            backgroundColor: 'var(--surface)', 
                            marginRight: 6, verticalAlign: 'middle', marginBottom: 2 
                          }} 
                        />
                      )}
                      {game.white_nickname}
                    </span>
                    <span style={{ color: "var(--muted)" }}> vs </span>
                    <span style={{ fontWeight: game.black_id === currentUserId ? 600 : 500 }}>
                      {game.black_nickname}
                      {game.black_id === currentUserId && (
                        <span 
                          title="Played as Black"
                          style={{ 
                            display: 'inline-block', width: 9, height: 9, 
                            backgroundColor: 'var(--ink)', 
                            marginLeft: 6, verticalAlign: 'middle', marginBottom: 2 
                          }} 
                        />
                      )}
                    </span>
                  </td>
                  <td
                    className="px-6 py-3.5 whitespace-nowrap text-sm capitalize"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    {game.format}
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <ResultBadge game={game} currentUserId={currentUserId} />
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-right">
                    {game.status === "finished" ? (
                      <Link
                        to={`/analysis/${game.id}`}
                        className="text-xs"
                        style={{ color: "var(--accent)", fontWeight: 500 }}
                      >
                        Analyze →
                      </Link>
                    ) : (
                      <span
                        className="text-xs"
                        style={{ color: "var(--muted)" }}
                      >
                        Analyze →
                      </span>
                    )}
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

const FORMATS = [
  { value: "bullet", label: "Bullet", time: "1 + 1" },
  { value: "blitz", label: "Blitz", time: "3 + 2" },
  { value: "rapid", label: "Rapid", time: "10 + 0" },
];

export default function Dashboard() {
  const token = useUserStore((state) => state.token);
  const userId = useUserStore((state) => state.userId);
  const setUserStore = useUserStore((state) => state.setUser);
  const [user, setUser] = useState(null);
  const [lastGames, setLastGames] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchmaking, setMatchmaking] = useState(false);
  const [gameFormat, setGameFormat] = useState("blitz");
  const [socket, setSocket] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    async function fetchData() {
      setLoading(true);
      try {
        const userRes = await fetch(`${API_URL}/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const userData = await userRes.json();
        setUser(userData);
        setUserStore(userData);

        const gamesRes = await fetch(`${API_URL}/players/history`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const gamesData = await gamesRes.json();
        setLastGames(gamesData);

        const leaderboardRes = await fetch(`${API_URL}/players/leaderboard`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const leaderboardData = await leaderboardRes.json();
        setLeaderboard(leaderboardData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [token, setUserStore, navigate]);

  const startNewGame = async () => {
    setMatchmaking(true);
    try {
      const wsUrl = `${WS_URL}/match/join?token=${token}`;
      const newSocket = new WebSocket(wsUrl);
      setSocket(newSocket);

      newSocket.onopen = () => {
        newSocket.send(JSON.stringify({ game_format: gameFormat }));
      };

      newSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.event === "match_found") {
          const gameId = data.game_id;
          if (!gameId) throw new Error("No game ID returned");
          newSocket.close();
          setMatchmaking(false);
          navigate(`/game/${gameId}`, { state: { match: data } });
        }
      };

      newSocket.onerror = (err) => {
        console.error("WebSocket error:", err);
        alert("Matchmaking connection failed");
        setMatchmaking(false);
      };

      newSocket.onclose = () => {
        setMatchmaking(false);
      };
    } catch (err) {
      console.error(err);
      alert(err.message);
      setMatchmaking(false);
    }
  };

  const cancelMatchmaking = () => {
    if (socket) socket.close();
    setMatchmaking(false);
  };

  if (!token) {
    return (
      <div
        className="text-center mt-20 max-w-md mx-auto p-8 ed-card"
        style={{ color: "var(--negative)" }}
      >
        You must be logged in to view the dashboard.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center mt-40">
        <div
          className="w-10 h-10 rounded-full animate-spin mb-4"
          style={{
            border: "2px solid var(--border)",
            borderTopColor: "var(--accent)",
          }}
        />
        <div className="text-sm" style={{ color: "var(--muted)" }}>
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] p-8">
      {matchmaking && (
        <div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center backdrop-blur-sm"
          style={{ backgroundColor: "rgba(245, 241, 234, 0.92)" }}
        >
          <div
            className="w-16 h-16 rounded-full animate-spin mb-8"
            style={{
              border: "2px solid var(--border)",
              borderTopColor: "var(--accent)",
            }}
          />
          <div className="ed-eyebrow mb-2">Matchmaking</div>
          <h2 className="serif text-4xl mb-2" style={{ color: "var(--ink)" }}>
            Searching for an opponent
          </h2>
          <p className="text-sm mb-10 capitalize" style={{ color: "var(--muted)" }}>
            {gameFormat} mode
          </p>
          <button onClick={cancelMatchmaking} className="ed-btn ed-btn-secondary">
            Cancel search
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-10">
        {/* Top: profile + play */}
        <section className="ed-card p-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            {user && <ProfileInfo user={user} />}

            <div className="flex flex-col gap-3 w-full lg:w-auto">
              <div className="ed-eyebrow">Choose a time control</div>
              <div className="flex flex-wrap gap-2">
                {FORMATS.map((f) => {
                  const active = gameFormat === f.value;
                  return (
                    <button
                      key={f.value}
                      onClick={() => setGameFormat(f.value)}
                      className="px-4 py-2.5 text-left"
                      style={{
                        backgroundColor: active ? "var(--ink)" : "transparent",
                        color: active ? "var(--surface)" : "var(--ink)",
                        border: `1px solid ${active ? "var(--ink)" : "var(--border-strong)"}`,
                        borderRadius: 2,
                        minWidth: 110,
                      }}
                    >
                      <div className="text-sm" style={{ fontWeight: 600 }}>
                        {f.label}
                      </div>
                      <div
                        className="text-xs mt-0.5"
                        style={{
                          color: active ? "rgba(251,248,243,0.7)" : "var(--muted)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {f.time}
                      </div>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={startNewGame}
                disabled={loading}
                className="ed-btn ed-btn-primary mt-2"
                style={{ padding: "0.85rem 2rem", fontSize: "1rem" }}
              >
                Play a game →
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <GameHistoryTable games={lastGames} currentUserId={userId} />
          </div>
          <div className="lg:col-span-1">
            <Leaderboard players={leaderboard} />
          </div>
        </div>
      </div>
    </div>
  );
}
