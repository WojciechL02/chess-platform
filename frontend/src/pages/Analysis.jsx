import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { useUserStore } from "../store/UserStore";


const CLASSIFICATION_STYLE = {
  best:       { color: "#3d6b3a", label: "Best" },
  excellent:  { color: "#6b8a3d", label: "Excellent" },
  good:       { color: "#3d3833", label: "Good" },
  inaccuracy: { color: "#b58a3a", label: "Inaccuracy" },
  mistake:    { color: "#c2693d", label: "Mistake" },
  blunder:    { color: "#a73a2a", label: "Blunder" },
};


function fenAfter(moves, index) {
  const chess = new Chess();
  for (let i = 0; i <= index && i < moves.length; i++) {
    const uci = moves[i].uci;
    chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length === 5 ? uci[4] : undefined,
    });
  }
  return chess.fen();
}


function evalFromWhitePov(move) {
  const cp = move.eval_after;
  return move.player_color === "white" ? cp : -cp;
}


function formatEval(cp) {
  if (cp >= 9000) return `M${Math.ceil((10000 - cp) / 2)}`;
  if (cp <= -9000) return `-M${Math.ceil((10000 + cp) / 2)}`;
  const pawns = (cp / 100).toFixed(2);
  return cp > 0 ? `+${pawns}` : pawns;
}


function SummaryColumn({ color, stats }) {
  const order = ["best", "excellent", "good", "inaccuracy", "mistake", "blunder"];
  return (
    <div className="ed-card flex-1 p-5">
      <div className="flex justify-between items-baseline mb-4">
        <div>
          <div className="ed-eyebrow mb-1">Side</div>
          <h3 className="serif text-xl" style={{ color: "var(--ink)" }}>{color}</h3>
        </div>
        <div className="text-right">
          <div className="ed-eyebrow mb-1">Avg loss</div>
          <span
            className="text-base"
            style={{ color: "var(--ink)", fontFamily: "var(--font-mono)", fontWeight: 600 }}
          >
            {stats.avg_centipawn_loss}cp
          </span>
        </div>
      </div>
      <hr className="ed-rule mb-3" />
      <div className="space-y-1.5">
        {order.map((key) => (
          <div key={key} className="flex justify-between items-center text-sm">
            <span style={{ color: CLASSIFICATION_STYLE[key].color, fontWeight: 500 }}>
              {CLASSIFICATION_STYLE[key].label}
            </span>
            <span style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
              {stats[key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}


export default function Analysis() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const token = useUserStore((state) => state.token);
  const API_URL = import.meta.env.VITE_API_URL;

  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(-1);

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/analysis/${gameId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error(`Analysis request failed (${res.status})`);
        }
        const data = await res.json();
        if (!cancelled) setAnalysis(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [API_URL, gameId, token, navigate]);

  const moves = useMemo(() => analysis?.moves ?? [], [analysis]);
  const fen = useMemo(() => fenAfter(moves, currentIndex), [moves, currentIndex]);

  const chartData = useMemo(() => {
    const series = [{ ply: 0, eval: 0, label: "start" }];
    moves.forEach((m, i) => {
      series.push({
        ply: i + 1,
        eval: evalFromWhitePov(m),
        label: `${Math.floor(i / 2) + 1}${i % 2 === 0 ? "." : "..."} ${m.san}`,
      });
    });
    return series;
  }, [moves]);

  const goToMove = (i) => setCurrentIndex(Math.max(-1, Math.min(i, moves.length - 1)));
  const prev = () => goToMove(currentIndex - 1);
  const next = () => goToMove(currentIndex + 1);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center mt-40">
        <div className="ed-eyebrow mb-3">Working</div>
        <h2 className="serif text-3xl mb-2" style={{ color: "var(--ink)" }}>
          Analyzing your game
        </h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          First run takes 10–30 seconds. Cached afterwards.
        </p>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="ed-card text-center mt-20 p-8 max-w-md mx-auto">
        <div className="ed-eyebrow mb-2">Something went wrong</div>
        <p className="mb-4" style={{ color: "var(--negative)" }}>
          {error || "No analysis available"}
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="ed-btn"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  const summary = analysis.summary;
  const currentMove = currentIndex >= 0 ? moves[currentIndex] : null;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-end pb-2" style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <div className="ed-eyebrow mb-1">Review</div>
            <h1 className="serif text-3xl" style={{ color: "var(--ink)" }}>
              Game analysis
            </h1>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="text-sm"
            style={{ color: "var(--muted)", fontWeight: 500 }}
          >
            ← Back to dashboard
          </button>
        </div>

        <div className="flex gap-4">
          <SummaryColumn color="White" stats={summary.white} />
          <SummaryColumn color="Black" stats={summary.black} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Board + eval graph */}
          <div className="lg:col-span-2 space-y-4">
            <div
              className="aspect-square max-w-[600px] mx-auto overflow-hidden"
              style={{ border: "1px solid var(--border)", borderRadius: 2 }}
            >
              <Chessboard
                options={{
                  position: fen,
                  allowDragging: false,
                  id: "analysis-board",
                }}
              />
            </div>

            <div className="flex justify-center items-center gap-2">
              <button onClick={() => goToMove(-1)} className="ed-btn">⏮</button>
              <button onClick={prev} disabled={currentIndex < 0} className="ed-btn">◀</button>
              <span
                className="min-w-[140px] text-center text-sm"
                style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
              >
                {currentIndex < 0
                  ? "Start"
                  : `Move ${currentIndex + 1} / ${moves.length}`}
              </span>
              <button onClick={next} disabled={currentIndex >= moves.length - 1} className="ed-btn">▶</button>
              <button onClick={() => goToMove(moves.length - 1)} className="ed-btn">⏭</button>
            </div>

            {currentMove && (
              <div className="ed-card p-4">
                <div className="flex justify-between items-baseline">
                  <div>
                    <span
                      className="serif text-2xl"
                      style={{ color: CLASSIFICATION_STYLE[currentMove.classification].color }}
                    >
                      {currentMove.san}
                    </span>
                    <span className="ml-3 text-sm" style={{ color: "var(--ink-soft)" }}>
                      {CLASSIFICATION_STYLE[currentMove.classification].label}
                      {currentMove.centipawn_loss > 0 && ` (−${currentMove.centipawn_loss}cp)`}
                    </span>
                  </div>
                  <div className="text-sm text-right">
                    <div className="ed-eyebrow mb-0.5">Engine prefers</div>
                    <span style={{ color: "var(--ink)", fontWeight: 600 }}>
                      {currentMove.best_move_san}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="ed-card p-5">
              <h3 className="serif text-lg mb-3" style={{ color: "var(--ink)" }}>
                Evaluation
              </h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 15, bottom: 20, left: 5 }}>
                    <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#d9d0c1" />
                    <XAxis
                      dataKey="ply"
                      tick={{ fill: "#6b6359", fontSize: 11 }}
                      axisLine={{ stroke: "#d9d0c1" }}
                      tickLine={{ stroke: "#d9d0c1" }}
                      label={{
                        value: "Ply (half-move)",
                        position: "insideBottom",
                        offset: -10,
                        fill: "#6b6359",
                        fontSize: 11,
                      }}
                    />
                    <YAxis
                      tick={{ fill: "#6b6359", fontSize: 11 }}
                      axisLine={{ stroke: "#d9d0c1" }}
                      tickLine={{ stroke: "#d9d0c1" }}
                      domain={[-1000, 1000]}
                      tickFormatter={(v) => (v / 100).toFixed(0)}
                      label={{
                        value: "Eval (pawns, +White / −Black)",
                        angle: -90,
                        position: "insideLeft",
                        offset: 15,
                        style: { textAnchor: "middle", fill: "#6b6359", fontSize: 11 },
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fbf8f3",
                        border: "1px solid #1a1a1a",
                        borderRadius: 2,
                        fontFamily: "Inter",
                      }}
                      itemStyle={{ color: "#8b2635", fontWeight: 600 }}
                      labelStyle={{ color: "#6b6359", marginBottom: 4, fontSize: 11 }}
                      formatter={(value) => [formatEval(value), "Eval"]}
                      labelFormatter={(ply) => chartData[ply]?.label || "Start"}
                    />
                    <ReferenceLine y={0} stroke="#1a1a1a" />
                    <ReferenceLine
                      x={currentIndex + 1}
                      stroke="#8b2635"
                      strokeDasharray="3 3"
                      label={{ value: "current", position: "top", fill: "#8b2635", fontSize: 9 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="eval"
                      stroke="#8b2635"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Move list */}
          <div
            className="ed-card overflow-hidden flex flex-col h-[calc(100vh-12rem)]"
          >
            <div
              className="px-4 py-3"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div className="ed-eyebrow">Moves</div>
            </div>
            <div className="flex-grow overflow-y-auto p-2">
              <div className="grid grid-cols-[auto_1fr_1fr] gap-1 text-sm">
                {moves.reduce((rows, m, i) => {
                  if (i % 2 === 0) rows.push([m]);
                  else rows[rows.length - 1].push(m);
                  return rows;
                }, []).map((pair, rowIdx) => {
                  const whiteIdx = rowIdx * 2;
                  const blackIdx = rowIdx * 2 + 1;
                  return (
                    <div key={rowIdx} className="contents">
                      <span
                        className="text-xs py-1 px-2"
                        style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
                      >
                        {rowIdx + 1}.
                      </span>
                      <button
                        onClick={() => goToMove(whiteIdx)}
                        className="text-left px-2 py-1 transition-colors"
                        style={{
                          color: CLASSIFICATION_STYLE[pair[0].classification].color,
                          fontWeight: 500,
                          backgroundColor: currentIndex === whiteIdx ? "var(--surface-sunk)" : "transparent",
                          borderRadius: 2,
                        }}
                      >
                        {pair[0].san}
                      </button>
                      {pair[1] ? (
                        <button
                          onClick={() => goToMove(blackIdx)}
                          className="text-left px-2 py-1 transition-colors"
                          style={{
                            color: CLASSIFICATION_STYLE[pair[1].classification].color,
                            fontWeight: 500,
                            backgroundColor: currentIndex === blackIdx ? "var(--surface-sunk)" : "transparent",
                            borderRadius: 2,
                          }}
                        >
                          {pair[1].san}
                        </button>
                      ) : <span />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
