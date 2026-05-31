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
  ResponsiveContainer,
} from "recharts";

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
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        const [userRes, winRes, ratingRes] = await Promise.all([
          fetch(`${API_URL}/users/me`, { headers }),
          fetch(`${API_URL}/players/win-ratios`, { headers }),
          fetch(`${API_URL}/players/rating-history`, { headers }),
        ]);

        const userData = await userRes.json();
        const winData = await winRes.json();
        const ratingData = await ratingRes.json();

        setUser(userData);
        setWinRatios(winData);

        const formattedRating = ratingData.map((item) => ({
          rating: item.rating,
          date: new Date(item.created_at).toLocaleDateString(),
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
      <div className="max-w-7xl mx-auto space-y-10">
        <header className="flex justify-between items-end">
          <div>
            <div className="ed-eyebrow mb-2">Your performance</div>
            <h1 className="serif text-5xl" style={{ color: "var(--ink)" }}>
              Statistics
            </h1>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="ed-btn ed-btn-ghost"
          >
            ← Back to dashboard
          </button>
        </header>

        <hr className="ed-rule-strong" />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Profile summary */}
          <div className="ed-card p-8 flex flex-col items-start">
            <div className="ed-eyebrow mb-4">Player</div>
            <div
              className="w-20 h-20 flex items-center justify-center mb-5"
              style={{
                backgroundColor: "var(--surface-sunk)",
                border: "1px solid var(--border)",
                borderRadius: 2,
              }}
            >
              <span className="serif text-4xl" style={{ color: "var(--ink)" }}>
                {(user?.nickname?.charAt(0) || "?").toUpperCase()}
              </span>
            </div>
            <h2 className="serif text-2xl mb-1" style={{ color: "var(--ink)" }}>
              {user?.nickname}
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
              {user?.email}
            </p>
            <hr className="ed-rule w-full mb-5" />
            <div className="ed-eyebrow mb-1">ELO rating</div>
            <div
              className="text-5xl"
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 500,
                color: "var(--accent)",
              }}
            >
              {user?.elo_rating}
            </div>
          </div>

          {/* Win ratios */}
          <div className="lg:col-span-3 ed-card p-8">
            <div className="ed-eyebrow mb-2">Win rate by format</div>
            <h2 className="serif text-2xl mb-7" style={{ color: "var(--ink)" }}>
              Performance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {winRatios.length > 0 ? (
                winRatios.map((ratio) => (
                  <div
                    key={ratio.format}
                    className="ed-card-sunk p-6 flex flex-col"
                  >
                    <div className="ed-eyebrow mb-4 capitalize">
                      {ratio.format}
                    </div>
                    <div
                      className="text-5xl mb-3"
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontWeight: 500,
                        color: "var(--ink)",
                      }}
                    >
                      {(ratio.ratio * 100).toFixed(1)}
                      <span
                        className="text-2xl"
                        style={{ color: "var(--muted)" }}
                      >
                        %
                      </span>
                    </div>
                    <div
                      className="text-xs"
                      style={{
                        color: "var(--muted)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {ratio.wins} of {ratio.total} games won
                    </div>
                  </div>
                ))
              ) : (
                <div
                  className="col-span-3 text-center py-10 text-sm"
                  style={{ color: "var(--muted)" }}
                >
                  No game data available yet. Start playing to see your stats.
                </div>
              )}
            </div>
          </div>

          {/* Rating history */}
          <div className="lg:col-span-4 ed-card p-8">
            <div className="ed-eyebrow mb-2">ELO over time</div>
            <h2 className="serif text-2xl mb-7" style={{ color: "var(--ink)" }}>
              Rating progression
            </h2>
            <div className="h-96 w-full">
              {ratingHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={ratingHistory}
                    margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="2 4"
                      vertical={false}
                      stroke="#d9d0c1"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#6b6359", fontSize: 11 }}
                      minTickGap={30}
                      axisLine={{ stroke: "#d9d0c1" }}
                      tickLine={{ stroke: "#d9d0c1" }}
                    />
                    <YAxis
                      domain={["dataMin - 50", "dataMax + 50"]}
                      tick={{ fill: "#6b6359", fontSize: 11 }}
                      axisLine={{ stroke: "#d9d0c1" }}
                      tickLine={{ stroke: "#d9d0c1" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fbf8f3",
                        border: "1px solid #1a1a1a",
                        borderRadius: 2,
                        fontFamily: "Inter",
                      }}
                      itemStyle={{ color: "#8b2635", fontWeight: 600 }}
                      labelStyle={{
                        color: "#6b6359",
                        marginBottom: 4,
                        fontSize: 11,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rating"
                      stroke="#8b2635"
                      strokeWidth={2}
                      dot={{
                        r: 3,
                        fill: "#8b2635",
                        strokeWidth: 2,
                        stroke: "#fbf8f3",
                      }}
                      activeDot={{ r: 6, fill: "#8b2635", strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div
                  className="h-full flex items-center justify-center text-sm"
                  style={{ color: "var(--muted)" }}
                >
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
