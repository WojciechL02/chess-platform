import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { useUserStore } from "../store/UserStore";
import { Chess } from "chess.js";
import { WS_URL } from "../config";

function formatClock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function PlayerRow({ name, time, isActive, isYou }) {
  return (
    <div
      className="w-full max-w-[600px] flex justify-between items-center px-3 py-2"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 2,
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 flex items-center justify-center"
          style={{
            backgroundColor: "var(--surface-sunk)",
            border: "1px solid var(--border)",
            borderRadius: 2,
          }}
        >
          <span className="serif text-base" style={{ color: "var(--ink)" }}>
            {(name?.charAt(0) || "?").toUpperCase()}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span style={{ color: "var(--ink)", fontWeight: 500 }}>{name}</span>
          {isYou && (
            <span className="ed-eyebrow" style={{ letterSpacing: "0.12em" }}>
              You
            </span>
          )}
        </div>
      </div>
      <div
        className="px-3 py-1.5 text-xl tabular-nums"
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 600,
          backgroundColor: isActive ? "var(--ink)" : "transparent",
          color: isActive ? "var(--surface)" : "var(--ink-soft)",
          border: `1px solid ${isActive ? "var(--ink)" : "var(--border)"}`,
          borderRadius: 2,
          minWidth: "5.5rem",
          textAlign: "center",
        }}
      >
        {formatClock(time)}
      </div>
    </div>
  );
}

function GameOverModal({ winnerName, onGoToDashboard, onAnalyze }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm p-4"
      style={{ backgroundColor: "rgba(245, 241, 234, 0.92)" }}
    >
      <div className="ed-card p-10 max-w-sm w-full text-center">
        <div className="ed-eyebrow mb-3">Final position</div>
        <h2 className="serif text-4xl mb-3" style={{ color: "var(--ink)" }}>
          Game over
        </h2>
        <p className="text-base mb-8" style={{ color: "var(--ink-soft)" }}>
          {winnerName ? (
            <>
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                {winnerName}
              </span>{" "}
              wins.
            </>
          ) : (
            "The game ended in a draw."
          )}
        </p>
        <hr className="ed-rule mb-8" />
        <button
          onClick={onAnalyze}
          className="ed-btn ed-btn-primary w-full mb-3"
          style={{ padding: "0.85rem 1.25rem" }}
        >
          Analyze game
        </button>
        <button
          onClick={onGoToDashboard}
          className="ed-btn w-full"
          style={{ padding: "0.85rem 1.25rem" }}
        >
          Back to dashboard
        </button>
      </div>
    </div>
  );
}

export default function GamePage() {
  const { gameId } = useParams();
  const location = useLocation();
  const token = useUserStore((state) => state.token);
  const userId = useUserStore((state) => state.userId);
  const nickname = useUserStore((state) => state.nickname);

  const match = location.state?.match || null;
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [gameResult, setGameResult] = useState({ winnerName: null });
  const navigate = useNavigate();

  const [whiteId, setWhiteId] = useState(match?.players?.white || null);
  const isWhite = whiteId === userId;
  const playerColor = isWhite ? "w" : "b";
  const orientation = isWhite ? "white" : "black";

  const opponentName = isWhite
    ? match?.players?.black_nickname || "Opponent"
    : match?.players?.white_nickname || "Opponent";

  const chessGameRef = useRef(new Chess());
  const chessGame = chessGameRef.current;
  const [chessPosition, setChessPosition] = useState(chessGame.fen());
  const [moves, setMoves] = useState([]);

  const [myTime, setMyTime] = useState(180);
  const [opponentTime, setOpponentTime] = useState(180);
  const [activeColor, setActiveColor] = useState("w");

  useEffect(() => {
    const wsUrl = `${WS_URL}/game/${gameId}?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setLoading(false);
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.event === "sync") {
        chessGame.load(msg.fen);
        setChessPosition(chessGame.fen());
        const currentWhiteId = msg.white_id || match?.players?.white;
        setWhiteId(currentWhiteId);

        if (userId === currentWhiteId) {
          setMyTime(msg.white_time);
          setOpponentTime(msg.black_time);
        } else {
          setMyTime(msg.black_time);
          setOpponentTime(msg.white_time);
        }
        setActiveColor(msg.turn === currentWhiteId ? "w" : "b");
      }

      if (msg.event === "move") {
        const uci = msg.uci;
        const from = uci.slice(0, 2);
        const to = uci.slice(2, 4);
        const promotion = uci.length === 5 ? uci[4] : undefined;

        if (msg.user_id !== userId) {
          chessGame.move({ from, to, promotion });
          setChessPosition(chessGame.fen());
          setMoves((prev) => [...prev, { san: uci, player: "Opponent" }]);
        }

        const currentWhiteId = whiteId || msg.white_id || match?.players?.white;
        if (userId === currentWhiteId) {
          setMyTime(msg.white_time);
          setOpponentTime(msg.black_time);
        } else {
          setMyTime(msg.black_time);
          setOpponentTime(msg.white_time);
        }
        setActiveColor(msg.turn === currentWhiteId ? "w" : "b");
      }

      if (msg.event === "game_over") {
        setGameResult({ winnerName: msg.winner_name });
        setGameOver(true);
        setActiveColor(null);
        ws.close();
      }
    };

    ws.onerror = (err) => {
      console.error("Game WS error:", err);
    };

    ws.onclose = () => {
      console.log("Disconnected from game WS");
    };

    setSocket(ws);
    return () => ws.close();
  }, [gameId, token, whiteId, chessGame, match?.players?.white, userId]);

  useEffect(() => {
    if (!activeColor || gameOver) return;
    const interval = setInterval(() => {
      if (
        (activeColor === "w" && playerColor === "w") ||
        (activeColor === "b" && playerColor === "b")
      ) {
        setMyTime((prev) => Math.max(prev - 1, 0));
      } else {
        setOpponentTime((prev) => Math.max(prev - 1, 0));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeColor, gameOver, playerColor]);

  const onPieceDrop = ({ sourceSquare, targetSquare, promotion }) => {
    if (gameOver) return false;
    try {
      if (!targetSquare) return false;

      const moveObj = promotion
        ? { from: sourceSquare, to: targetSquare, promotion }
        : { from: sourceSquare, to: targetSquare };

      const move = chessGame.move(moveObj);
      if (move === null) return false;

      setChessPosition(chessGame.fen());
      const uci = sourceSquare + targetSquare + (promotion || "");
      setMoves((prev) => [...prev, { san: uci, player: "You" }]);
      setActiveColor(playerColor === "w" ? "b" : "w");

      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ event: "move", uci }));
      }
      return true;
    } catch (err) {
      console.error("Error making move:", err);
      return false;
    }
  };

  const canDragPieceAll = (piece) => {
    if (gameOver) return false;
    return piece.piece.pieceType[0] === playerColor;
  };

  const offerDraw = () => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ event: "offer_draw" }));
    }
  };

  const resign = () => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ event: "resign" }));
    }
  };

  if (loading)
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
          Connecting to game…
        </div>
      </div>
    );

  return (
    <div className="min-h-[calc(100vh-3.5rem)] p-6 flex flex-col items-center">
      {gameOver && (
        <GameOverModal
          winnerName={gameResult.winnerName}
          onGoToDashboard={() => navigate("/dashboard")}
          onAnalyze={() => navigate(`/analysis/${gameId}`)}
        />
      )}

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Board column */}
        <div className="lg:col-span-3 flex flex-col items-center gap-2">
          <PlayerRow
            name={opponentName}
            time={opponentTime}
            isActive={activeColor !== playerColor && !gameOver}
            isYou={false}
          />

          <div
            className="w-full max-w-[600px] aspect-square overflow-hidden"
            style={{
              border: "1px solid var(--border-strong)",
              borderRadius: 2,
            }}
          >
            <Chessboard
              key={orientation}
              options={{
                canDragPiece: canDragPieceAll,
                position: chessPosition,
                onPieceDrop,
                boardOrientation: orientation,
                id: "game-board",
                lightSquareStyle: { backgroundColor: "var(--board-light)" },
                darkSquareStyle: { backgroundColor: "var(--board-dark)" },
                darkSquareNotationStyle: { color: "var(--board-light)" },
                lightSquareNotationStyle: { color: "var(--board-dark)" },
              }}
            />
          </div>

          <PlayerRow
            name={nickname}
            time={myTime}
            isActive={activeColor === playerColor && !gameOver}
            isYou
          />
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="ed-card overflow-hidden flex flex-col h-[500px]">
            <div
              className="px-4 py-3"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div className="ed-eyebrow">Notation</div>
            </div>
            <div className="flex-grow overflow-y-auto p-3">
              <div
                className="grid grid-cols-[2rem_1fr_1fr] gap-x-3 gap-y-1.5"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.875rem",
                }}
              >
                {moves
                  .reduce((acc, move, i) => {
                    if (i % 2 === 0) acc.push([move]);
                    else acc[acc.length - 1].push(move);
                    return acc;
                  }, [])
                  .map((pair, i) => (
                    <div key={i} className="contents">
                      <span style={{ color: "var(--muted)" }}>{i + 1}.</span>
                      <span style={{ color: "var(--ink)" }}>{pair[0].san}</span>
                      <span style={{ color: "var(--ink)" }}>
                        {pair[1]?.san || ""}
                      </span>
                    </div>
                  ))}
                {moves.length === 0 && (
                  <span
                    className="col-span-3 text-center py-6 text-xs"
                    style={{ color: "var(--muted)" }}
                  >
                    Moves will appear here.
                  </span>
                )}
              </div>
            </div>
            <div
              className="p-3 grid grid-cols-2 gap-2"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <button
                onClick={offerDraw}
                className="ed-btn ed-btn-ghost text-sm"
                style={{ padding: "0.5rem 0.75rem" }}
              >
                Offer draw
              </button>
              <button
                onClick={resign}
                className="ed-btn ed-btn-ghost text-sm"
                style={{ padding: "0.5rem 0.75rem", color: "var(--negative)" }}
              >
                Resign
              </button>
            </div>
          </div>

          <div className="ed-card p-4">
            <div className="ed-eyebrow mb-2">Match details</div>
            <dl
              className="text-xs space-y-1.5"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              <div className="flex justify-between gap-2">
                <dt style={{ color: "var(--muted)" }}>Game</dt>
                <dd
                  style={{ color: "var(--ink)" }}
                  className="truncate max-w-[160px]"
                  title={gameId}
                >
                  {gameId}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt style={{ color: "var(--muted)" }}>Format</dt>
                <dd style={{ color: "var(--ink)" }} className="capitalize">
                  {match?.format || "Standard"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
