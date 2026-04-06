import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useUserStore } from "../store/UserStore";
import Leaderboard from "../components/Leaderboard";
import LastGames from "../components/LastGames";
import ProfileInfo from "../components/ProfileInfo";

export default function Dashboard() {
  const token = useUserStore((state) => state.token)
    const setUserStore = useUserStore((state) => state.setUser);
  const [user, setUser] = useState(null);
  const [lastGames, setLastGames] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
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

        // // Fetch last games
        // const gamesRes = await fetch(`${API_URL}/games/last`, {
        //   headers: { Authorization: `Bearer ${token}` },
        // });
        // const gamesData = await gamesRes.json();
        // setLastGames(gamesData);

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
  }, [token]);

  const startNewGame = async () => {
      setLoading(true);

      try {
        const wsUrl = `${API_URL}/match/join?token=${token}`;
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          console.log("Connected to matchmaker via WebSocket");
        };

        socket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          console.log("Message from server:", data);

          if (data.event === "match_found") {
            const gameId = data.game_id;
            if (!gameId) throw new Error("No game ID returned");
            socket.close();
            navigate(`/game/${gameId}`, { state: { match: data } });
          }
        };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
      alert("Matchmaking connection failed");
    };

    socket.onclose = () => {
      console.log("Disconnected from matchmaker");
    };
  } catch (err) {
    console.error(err);
    alert(err.message);
  } finally {
    setLoading(false);
  }
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
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top section: Profile + Start Game */}
        <div className="flex justify-between items-center">
          {user && <ProfileInfo user={user} />}
          <button
              onClick={startNewGame}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Start New Game"}
          </button>
        </div>

        {/* Last Games */}
        {/*<LastGames games={lastGames} />*/}

        {/* Leaderboard */}
        <Leaderboard players={leaderboard} />
      </div>
    </div>
  );
}
