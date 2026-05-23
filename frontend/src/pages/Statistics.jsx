import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useUserStore } from "../store/UserStore";
import { API_URL } from "../config";
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
  }, [token, navigate]);

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center mt-40">
            <div className="w-12 h-12 border-4 border-[#81b64c] border-t-transparent rounded-full animate-spin mb-4"></div>
            <div className="text-white font-bold">Loading statistics...</div>
        </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#302e2b] p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center bg-[#262421] p-6 rounded border border-[#403d39] shadow-lg">
          <h1 className="text-3xl font-black text-white italic">YOUR STATISTICS</h1>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-[#3c3934] text-[#bababa] px-6 py-2 rounded font-bold hover:text-white hover:bg-[#4a4742] transition-colors border border-[#403d39]"
          >
            DASHBOARD
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* User Profile Summary */}
          <div className="bg-[#262421] p-8 rounded border border-[#403d39] flex flex-col items-center text-center shadow-xl">
            <div className="w-24 h-24 bg-[#302e2b] rounded-full flex items-center justify-center border-4 border-[#81b64c] mb-6 shadow-inner">
                <span className="text-4xl font-black text-[#81b64c] uppercase">{user?.nickname?.charAt(0)}</span>
            </div>
            <h2 className="text-2xl font-black text-white mb-1 uppercase tracking-tight">{user?.nickname}</h2>
            <div className="text-5xl font-black text-[#81b64c] mb-4 tabular-nums">
              {user?.elo_rating}
            </div>
            <p className="text-[#bababa] text-sm font-semibold">{user?.email}</p>
          </div>

          {/* Win Ratios */}
          <div className="lg:col-span-3 bg-[#262421] p-8 rounded border border-[#403d39] shadow-xl">
            <h2 className="text-sm font-black text-[#bababa] uppercase tracking-widest mb-8">Win Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {winRatios.length > 0 ? winRatios.map((ratio) => (
                <div key={ratio.format} className="bg-[#302e2b] border border-[#403d39] rounded p-6 flex flex-col items-center group hover:border-[#81b64c] transition-colors">
                  <div className="text-xs uppercase font-black text-[#bababa] mb-4 tracking-tighter">{ratio.format}</div>
                  <div className="text-4xl font-black text-white mb-2 italic">{(ratio.ratio * 100).toFixed(1)}%</div>
                  <div className="text-xs text-[#81b64c] font-bold bg-[#81b64c]/10 px-2 py-1 rounded">
                    {ratio.wins}W / {ratio.total} GAMES
                  </div>
                </div>
              )) : (
                <div className="col-span-3 text-center text-[#bababa] italic py-10 bg-[#302e2b] rounded border border-dashed border-[#403d39]">
                  No game data available yet. Start playing to see your stats!
                </div>
              )}
            </div>
          </div>

          {/* Rating History Plot */}
          <div className="lg:col-span-4 bg-[#262421] p-8 rounded border border-[#403d39] shadow-xl">
            <h2 className="text-sm font-black text-[#bababa] uppercase tracking-widest mb-10">ELO Progression</h2>
            <div className="h-96 w-full">
              {ratingHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ratingHistory}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#403d39" />
                    <XAxis 
                      dataKey="date" 
                      tick={{fill: '#bababa', fontSize: 11, fontWeight: 'bold'}}
                      minTickGap={30}
                      axisLine={{stroke: '#403d39'}}
                    />
                    <YAxis 
                      domain={['dataMin - 50', 'dataMax + 50']}
                      tick={{fill: '#bababa', fontSize: 11, fontWeight: 'bold'}}
                      axisLine={{stroke: '#403d39'}}
                      tabularNums
                    />
                    <Tooltip 
                        contentStyle={{backgroundColor: '#262421', border: '1px solid #403d39', borderRadius: '4px'}}
                        itemStyle={{color: '#81b64c', fontWeight: 'bold'}}
                        labelStyle={{color: '#bababa', marginBottom: '4px', fontSize: '12px'}}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="rating" 
                      stroke="#81b64c" 
                      strokeWidth={4}
                      dot={{ r: 4, fill: '#81b64c', strokeWidth: 2, stroke: '#262421' }}
                      activeDot={{ r: 8, fill: '#a3d160', strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[#bababa] italic bg-[#302e2b] rounded border border-dashed border-[#403d39]">
                  Not enough data to generate rating history.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
