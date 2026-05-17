import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useUserStore } from "../store/UserStore";
import Leaderboard from "../components/Leaderboard";
import LastGames from "../components/LastGames";
import ProfileInfo from "../components/ProfileInfo";

function GameHistoryTable({ games }) {
  return (
    <div className="bg-[#262421] rounded border border-[#403d39] overflow-hidden shadow-xl">
      <div className="px-6 py-4 border-b border-[#403d39] flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Recent Games</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[#403d39]">
          <thead className="bg-[#21201d]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-[#bababa] uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-[#bababa] uppercase tracking-wider">Players</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-[#bababa] uppercase tracking-wider">Format</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-[#bababa] uppercase tracking-wider">Result</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-[#bababa] uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-[#262421] divide-y divide-[#403d39]">
            {games.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-10 text-center text-[#bababa]">No games found</td>
              </tr>
            ) : (
              games.map((game) => (
                <tr key={game.id} className="hover:bg-[#3c3934] transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#bababa]">
                    {new Date(game.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-white">
                    {game.white_nickname} <span className="text-[#bababa] font-normal">vs</span> {game.black_nickname}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#bababa] capitalize">
                    {game.format}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${game.status === "finished" ? "text-[#81b64c]" : "text-[#bababa]"}`}>
                      {game.status === "finished" ? (game.winner_id ? "Decisive" : "Draw") : game.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button disabled className="text-[#bababa] opacity-50 cursor-not-allowed font-semibold hover:text-white">
                      Analyze
                    </button>
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

export default function Dashboard() {
  const token = useUserStore((state) => state.token)
  const setUserStore = useUserStore((state) => state.setUser);
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
    if (!token) {
      navigate("/");
      return;
    }

    async function fetchData() {
      setLoading(true);
      try {
        const userRes = await fetch(`${API_URL}/users/me`, {
          headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
          },
        });
        const userData = await userRes.json();
        setUser(userData);
        setUserStore(userData);

        const gamesRes = await fetch(`${API_URL}/players/history`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const gamesData = await gamesRes.json();
        setLastGames(gamesData);

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
  }, [token, API_URL, setUserStore]);

  const startNewGame = async () => {
      setMatchmaking(true);

      try {
        const wsUrl = `${API_URL.replace("http", "ws")}/match/join?token=${token}`;
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
    if (socket) {
        socket.close();
    }
    setMatchmaking(false);
};

  if (!token) {
    return (
      <div className="text-center mt-20 text-red-500 font-bold bg-[#262421] p-8 max-w-md mx-auto rounded border border-[#403d39]">
        You must be logged in to view the dashboard.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center mt-40">
        <div className="w-12 h-12 border-4 border-[#81b64c] border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-white font-bold">Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#302e2b] p-6">
      {/* Matchmaking Overlay */}
      {matchmaking && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-white">
          <div className="w-20 h-20 border-4 border-[#81b64c] border-t-transparent rounded-full animate-spin mb-6"></div>
          <h2 className="text-3xl font-bold mb-2">Finding a match...</h2>
          <p className="text-[#bababa] mb-8 capitalize text-lg">{gameFormat} mode</p>
          <button
            onClick={cancelMatchmaking}
            className="px-8 py-3 bg-[#262421] hover:bg-[#3c3934] border border-[#403d39] rounded font-bold transition-all"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top section: Profile + Start Game */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[#262421] p-6 rounded border border-[#403d39] shadow-lg">
          {user && <ProfileInfo user={user} />}
          
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            <div className="flex flex-col space-y-1 min-w-[150px]">
              <label className="text-xs font-bold text-[#bababa] uppercase">Time Control</label>
              <select
                value={gameFormat}
                onChange={(e) => setGameFormat(e.target.value)}
                className="rounded bg-[#302e2b] border-[#403d39] px-4 py-2.5 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#81b64c]"
              >
                <option value="bullet">Bullet (1+1)</option>
                <option value="blitz">Blitz (3+2)</option>
                <option value="rapid">Rapid (10+0)</option>
              </select>
            </div>
            
            <button
                onClick={startNewGame}
                disabled={loading}
                className="h-[46px] mt-5 md:mt-5 px-8 bg-[#81b64c] text-white font-black text-lg rounded hover:bg-[#a3d160] transition-all shadow-[0_0.25rem_0_#537131] active:translate-y-1 active:shadow-none flex-grow md:flex-grow-0"
              >
                PLAY
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Last Games */}
          <div className="lg:col-span-2">
            <GameHistoryTable games={lastGames} />
          </div>

          {/* Leaderboard */}
          <div className="lg:col-span-1">
            <Leaderboard players={leaderboard} />
          </div>
        </div>
      </div>
    </div>
  );
}
