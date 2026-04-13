import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useUserStore } from "../store/UserStore";
import Leaderboard from "../components/Leaderboard";
import LastGames from "../components/LastGames";
import ProfileInfo from "../components/ProfileInfo";

function GameHistoryTable({ games }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">Recent Games</h2>
      </div>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Players</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Format</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {games.length === 0 ? (
            <tr>
              <td colSpan="5" className="px-6 py-4 text-center text-gray-500">No games found</td>
            </tr>
          ) : (
            games.map((game) => (
              <tr key={game.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(game.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {game.white_nickname} vs {game.black_nickname}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                  {game.format}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {game.status === "finished" ? (game.winner_id ? "Decisive" : "Draw") : game.status}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button disabled className="text-gray-400 cursor-not-allowed font-semibold">
                    Analyze
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function Dashboard() {
  const token = useUserStore((state) => state.token)
  const setUserStore = useUserStore((state) => state.setUser);
  const clearUser = useUserStore((state) => state.clearUser);
  const [user, setUser] = useState(null);
  const [lastGames, setLastGames] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchmaking, setMatchmaking] = useState(false);
  const [gameFormat, setGameFormat] = useState("blitz");
  const [socket, setSocket] = useState(null);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (!token) return;

    async function fetchData() {
      setLoading(true);
      try {
        // Fetch user profile
        const userRes = await fetch(`${API_URL}/users/me`, {
          headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
          },
        });
        const userData = await userRes.json();
        setUser(userData);
        setUserStore(userData);

        // Fetch last games
        const gamesRes = await fetch(`${API_URL}/players/history`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const gamesData = await gamesRes.json();
        setLastGames(gamesData);

        // Fetch leaderboard
        const leaderboardRes = await fetch(`${API_URL}/players/leaderboard`, {
          headers: {
              "Authorization": `Bearer ${token}`,
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
  }, [token, API_URL]);

  const handleLogout = () => {
    clearUser();
    navigate("/");
  };

  const startNewGame = async () => {
      setMatchmaking(true);

      try {
        const wsUrl = `${API_URL}/match/join?token=${token}`;
        const newSocket = new WebSocket(wsUrl);
        setSocket(newSocket);

        newSocket.onopen = () => {
          console.log("Connected to matchmaker via WebSocket");
          newSocket.send(JSON.stringify({ game_format: gameFormat }));
        };

        newSocket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          console.log("Message from server:", data);

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
      console.log("Disconnected from matchmaker");
      setMatchmaking(false);
    };
  } catch (err) {
    console.error(err);
    alert(err.message);
    setMatchmaking(false);
  }
};

const cancelMatchmaking = () => {
    if (socket) {
        socket.close();
    }
    setMatchmaking(false);
};

  if (!token) {
    return (
      <div className="text-center mt-20 text-red-600 font-semibold">
        You must be logged in to view the dashboard.
      </div>
    );
  }

  if (loading) {
    return <div className="text-center mt-20">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 relative">
      {/* Matchmaking Overlay */}
      {matchmaking && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-70 text-white">
          <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-4"></div>
          <h2 className="text-2xl font-bold mb-2">Finding a match...</h2>
          <p className="text-gray-300 mb-6 capitalize">{gameFormat} mode</p>
          <button
            onClick={cancelMatchmaking}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top section: Profile + Start Game */}
        <div className="flex justify-between items-center">
          {user && <ProfileInfo user={user} />}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/statistics")}
              className="rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
            >
              Statistics
            </button>
            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Logout
            </button>
            <select
              value={gameFormat}
              onChange={(e) => setGameFormat(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 bg-white"
            >
              <option value="bullet">Bullet (1+1)</option>
              <option value="blitz">Blitz (3+2)</option>
              <option value="rapid">Rapid (10+0)</option>
            </select>
            <button
                onClick={startNewGame}
                disabled={loading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Loading..." : "Start New Game"}
            </button>
          </div>
        </div>

        {/* Last Games */}
        <GameHistoryTable games={lastGames} />

        {/* Leaderboard */}
        <Leaderboard players={leaderboard} />
      </div>
    </div>
  );
}
