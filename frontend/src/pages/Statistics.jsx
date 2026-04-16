import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useUserStore } from "../store/UserStore";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export default function Statistics() {
  const token = useUserStore((state) => state.token);
  const [user, setUser] = useState(null);
  const [winRatios, setWinRatios] = useState([]);
  const [ratingHistory, setRatingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
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
        const headers = {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        const [userRes, winRes, ratingRes] = await Promise.all([
          fetch(`${API_URL}/users/me`, { headers }),
          fetch(`${API_URL}/players/win-ratios`, { headers }),
          fetch(`${API_URL}/players/rating-history`, { headers })
        ]);

        const userData = await userRes.json();
        const winData = await winRes.json();
        const ratingData = await ratingRes.json();

        setUser(userData);
        setWinRatios(winData);
        
        // Format rating data for Recharts
        const formattedRating = ratingData.map(item => ({
          rating: item.rating,
          date: new Date(item.created_at).toLocaleDateString()
        }));
        setRatingHistory(formattedRating);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [token, navigate, API_URL]);

  if (loading) {
    return <div className="text-center mt-20">Loading statistics...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow">
          <h1 className="text-3xl font-bold text-gray-800">Your Statistics</h1>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Info & ELO */}
          <div className="bg-white p-6 rounded-lg shadow flex flex-col justify-center items-center">
            <h2 className="text-xl font-bold text-gray-700 mb-2">{user?.nickname}</h2>
            <div className="text-4xl font-black text-blue-600 mb-2">
              ELO: {user?.elo_rating}
            </div>
            <p className="text-gray-500 text-sm">{user?.email}</p>
          </div>

          {/* Win Ratios */}
          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Win Ratios</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {winRatios.length > 0 ? winRatios.map((ratio) => (
                <div key={ratio.format} className="border rounded-lg p-4 text-center">
                  <div className="text-sm uppercase font-bold text-gray-500">{ratio.format}</div>
                  <div className="text-2xl font-bold text-gray-800">{(ratio.ratio * 100).toFixed(1)}%</div>
                  <div className="text-xs text-gray-400">{ratio.wins}W / {ratio.total} Total</div>
                </div>
              )) : (
                <div className="col-span-3 text-center text-gray-500 italic py-4">
                  No finished games yet.
                </div>
              )}
            </div>
          </div>

          {/* Rating History Plot */}
          <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Rating History</h2>
            <div className="h-80 w-full">
              {ratingHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ratingHistory}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tick={{fontSize: 12}}
                      minTickGap={30}
                    />
                    <YAxis 
                      domain={['dataMin - 50', 'dataMax + 50']}
                      tick={{fontSize: 12}}
                    />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="rating" 
                      stroke="#2563eb" 
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 italic">
                  Not enough data to show rating history.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
