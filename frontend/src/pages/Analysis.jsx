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
  Tooltip,
  ReferenceLine,
} from "recharts";
import { useUserStore } from "../store/UserStore";


const CLASSIFICATION_STYLE = {
  best:       { color: "#81b64c", label: "Best" },
  excellent:  { color: "#9eb868", label: "Excellent" },
  good:       { color: "#bababa", label: "Good" },
  inaccuracy: { color: "#e8a23b", label: "Inaccuracy" },
  mistake:    { color: "#d97757", label: "Mistake" },
  blunder:    { color: "#ca3431", label: "Blunder" },
};

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";


function fenAfter(moves, index) {
  // index = -1 means starting position; otherwise replay 0..index inclusive.
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
  // Service returns eval_after in centipawns from the mover's POV.
  // For a single White-POV time series we negate when Black moved.
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
    <div className="flex-1 bg-[#262421] rounded border border-[#403d39] p-4">
      <div className="flex justify-between items-baseline mb-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-white">{color}</h3>
        <span className="text-xs text-[#bababa] font-semibold">
          avg loss <span className="text-white">{stats.avg_centipawn_loss}cp</span>
        </span>
      </div>
      <div className="space-y-1">
        {order.map((key) => (
          <div key={key} className="flex justify-between items-center text-xs">
            <span style={{ color: CLASSIFICATION_STYLE[key].color }} className="font-bold">
              {CLASSIFICATION_STYLE[key].label}
            </span>
            <span className="text-[#bababa] font-mono">{stats[key]}</span>
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
  const [currentIndex, setCurrentIndex] = useState(-1); // -1 = starting position

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
        <div className="w-12 h-12 border-4 border-[#81b64c] border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-white font-bold">Analyzing your game…</div>
        <div className="text-[#bababa] text-sm mt-1">First run takes 10–30 seconds, then cached.</div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="text-center mt-20 text-red-400 font-bold bg-[#262421] p-8 max-w-md mx-auto rounded border border-[#403d39]">
        {error || "No analysis available"}
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-4 block mx-auto text-sm text-[#bababa] underline"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  const summary = analysis.summary;
  const currentMove = currentIndex >= 0 ? moves[currentIndex] : null;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#302e2b] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-black text-white">Game Review</h1>
          <button
            onClick={() => navigate("/dashboard")}
            className="text-sm text-[#bababa] hover:text-white font-semibold"
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
            <div className="aspect-square max-w-[600px] mx-auto shadow-2xl border-4 border-[#262421] rounded overflow-hidden">
              <Chessboard
                options={{
                  position: fen,
                  allowDragging: false,
                  id: "analysis-board",
                }}
              />
            </div>

            <div className="flex justify-center items-center gap-3">
              <button
                onClick={() => goToMove(-1)}
                className="px-3 py-1.5 bg-[#262421] border border-[#403d39] rounded text-sm font-bold hover:bg-[#3c3934]"
              >⏮</button>
              <button
                onClick={prev}
                disabled={currentIndex < 0}
                className="px-3 py-1.5 bg-[#262421] border border-[#403d39] rounded text-sm font-bold hover:bg-[#3c3934] disabled:opacity-40"
              >◀</button>
              <span className="text-[#bababa] font-mono text-sm min-w-[120px] text-center">
                {currentIndex < 0
                  ? "Start"
                  : `Move ${currentIndex + 1} / ${moves.length}`}
              </span>
              <button
                onClick={next}
                disabled={currentIndex >= moves.length - 1}
                className="px-3 py-1.5 bg-[#262421] border border-[#403d39] rounded text-sm font-bold hover:bg-[#3c3934] disabled:opacity-40"
              >▶</button>
              <button
                onClick={() => goToMove(moves.length - 1)}
                className="px-3 py-1.5 bg-[#262421] border border-[#403d39] rounded text-sm font-bold hover:bg-[#3c3934]"
              >⏭</button>
            </div>

            {currentMove && (
              <div className="bg-[#262421] rounded border border-[#403d39] p-4">
                <div className="flex justify-between items-baseline">
                  <div>
                    <span
                      className="font-black text-lg"
                      style={{ color: CLASSIFICATION_STYLE[currentMove.classification].color }}
                    >
                      {currentMove.san}
                    </span>
                    <span className="ml-2 text-sm text-[#bababa]">
                      {CLASSIFICATION_STYLE[currentMove.classification].label}
                      {currentMove.centipawn_loss > 0 && ` (−${currentMove.centipawn_loss}cp)`}
                    </span>
                  </div>
                  <div className="text-sm text-[#bababa]">
                    Best: <span className="text-white font-semibold">{currentMove.best_move_san}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-[#262421] rounded border border-[#403d39] p-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2">
                Evaluation
              </h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 15, bottom: 20, left: 5 }}>
                    <XAxis
                      dataKey="ply"
                      stroke="#bababa"
                      tick={{ fontSize: 10 }}
                      label={{
                        value: "Ply (half-move)",
                        position: "insideBottom",
                        offset: -10,
                        fill: "#bababa",
                        fontSize: 11,
                      }}
                    />
                    <YAxis
                      stroke="#bababa"
                      tick={{ fontSize: 10 }}
                      domain={[-1000, 1000]}
                      tickFormatter={(v) => (v / 100).toFixed(0)}
                      label={{
                        value: "Eval (pawns, +White / −Black)",
                        angle: -90,
                        position: "insideLeft",
                        offset: 15,
                        style: { textAnchor: "middle", fill: "#bababa", fontSize: 11 },
                      }}
                    />
                    <Tooltip
                      contentStyle={{ background: "#21201d", border: "1px solid #403d39" }}
                      labelStyle={{ color: "#bababa" }}
                      formatter={(value) => [formatEval(value), "Eval"]}
                      labelFormatter={(ply) => chartData[ply]?.label || "Start"}
                    />
                    <ReferenceLine y={0} stroke="#403d39" label={{ value: "equal", position: "right", fill: "#7a7670", fontSize: 9 }} />
                    <ReferenceLine x={currentIndex + 1} stroke="#81b64c" strokeDasharray="3 3" label={{ value: "current", position: "top", fill: "#81b64c", fontSize: 9 }} />
                    <Line type="monotone" dataKey="eval" stroke="#81b64c" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Move list */}
          <div className="bg-[#262421] rounded border border-[#403d39] overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
            <div className="bg-[#21201d] px-4 py-3 border-b border-[#403d39]">
              <h3 className="text-sm font-black text-[#bababa] uppercase tracking-widest">Moves</h3>
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
                      <span className="text-[#bababa] text-xs font-bold py-1 px-2">{rowIdx + 1}.</span>
                      <button
                        onClick={() => goToMove(whiteIdx)}
                        className={`text-left px-2 py-1 rounded font-semibold ${currentIndex === whiteIdx ? "bg-[#3c3934]" : "hover:bg-[#3c3934]"}`}
                        style={{ color: CLASSIFICATION_STYLE[pair[0].classification].color }}
                      >
                        {pair[0].san}
                      </button>
                      {pair[1] ? (
                        <button
                          onClick={() => goToMove(blackIdx)}
                          className={`text-left px-2 py-1 rounded font-semibold ${currentIndex === blackIdx ? "bg-[#3c3934]" : "hover:bg-[#3c3934]"}`}
                          style={{ color: CLASSIFICATION_STYLE[pair[1].classification].color }}
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
