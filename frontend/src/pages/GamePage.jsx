import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { useUserStore } from "../store/UserStore";
import { Chess } from "chess.js";

export default function GamePage() {
  const { gameId } = useParams();
  const location = useLocation();
  const token = useUserStore((state) => state.token);
  const userId = useUserStore((state) => state.userId);
  const nickname = useUserStore((state) => state.nickname);
  const opponentName = "Opponent";

  const match = location.state?.match || null;
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

  const isWhite = match?.players?.white === userId;
  const playerColor = isWhite ? "w" : "b";
  const orientation = isWhite ? "white" : "black";

  // chess.js instance
  const chessGameRef = useRef(new Chess());
  const chessGame = chessGameRef.current;
  const [chessPosition, setChessPosition] = useState(chessGame.fen());
  const [moves, setMoves] = useState([]); // each element: {san, player}

    // timer
    const initialTime = 3 * 60;
    const increment = 2;
    const [myTime, setMyTime] = useState(initialTime);
    const [opponentTime, setOpponentTime] = useState(initialTime);
    const [activeColor, setActiveColor] = useState("w");

  // WebSocket connection
  useEffect(() => {
    const wsUrl = `${API_URL}/game/${gameId}?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setLoading(false);
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      console.log("WS message:", msg);

      if (msg.event === "move") {
        const uci = msg.uci;
        const from = uci.slice(0, 2);
        const to = uci.slice(2, 4);
        const promotion = uci.length === 5 ? uci[4] : undefined;

        chessGame.move({ from: from, to: to, promotion: promotion });
        setChessPosition(chessGame.fen());
        setMoves((prev) => [...prev, { san: uci, player: "Opponent" }]);
      }

      if (msg.event === "game_over") {
        alert(`Game Over: ${msg.result}`);
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
    return () => {
        ws.close();
    };
  }, [gameId, token]);

  useEffect(() => {
      if (!activeColor) return;

      const interval = setInterval(() => {
        if ((activeColor === "w" && playerColor === "w") || (activeColor === "b" && playerColor === "b")) {
          setMyTime(prev => Math.max(prev - 1, 0));
        } else {
          setOpponentTime(prev => Math.max(prev - 1, 0));
        }
      }, 1000); // every second

      return () => clearInterval(interval);
    }, [activeColor]);

  const handleMoveUpdate = (uci) => {
      // Make move in chess.js
      const from = uci.slice(0,2);
      const to = uci.slice(2,4);
      const promotion = uci.length === 5 ? uci[4] : undefined;

      chessGame.move({ from: from, to: to, promotion: promotion });
      setChessPosition(chessGame.fen());

      // Switch active timer
      setActiveColor(prev => (prev === "w" ? "b" : "w"));

      // Optionally add increment
      if (prev === "w") setMyTime(prevTime => prevTime + increment);
      else setOpponentTime(prevTime => prevTime + increment);
    };

// Handle piece drop
const onPieceDrop = ({ sourceSquare, targetSquare, promotion}) => {
  try {
      if (!targetSquare) {
        return false;
      }

    // Only add promotion if needed
    const moveObj = promotion
      ? { from: sourceSquare, to: targetSquare, promotion: promotion }
      : { from: sourceSquare, to: targetSquare };

    chessGame.move(moveObj);
    setChessPosition(chessGame.fen());

    // Send UCI including promotion if exists
    const uci = sourceSquare + targetSquare + (promotion || "");
    setMoves((prev) => [...prev, { san: uci, player: "You" }]);
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ event: "move", uci: uci }));
    }
    return true;

  } catch (err) {
    console.error("Error making move:", err);
    console.error("Move details:", { sourceSquare, targetSquare, promotion });
    return false;
  }
};

const canDragPieceAll = (piece) => {
    return (piece.piece.pieceType[0] === playerColor)
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

  if (loading) return <div className="text-center mt-20">Connecting to game...</div>;

  return (
    <div className="p-6 flex flex-col items-center space-y-6">
      <h1 className="text-2xl font-bold">Game {gameId}</h1>

      <div className={`text-lg font-bold ${activeColor !== playerColor ? "text-green-600" : ""}`}>
        Time: {Math.floor(opponentTime / 60)}:{String(opponentTime % 60).padStart(2, "0")}
      </div>
      <div className="text-lg font-semibold text-gray-700">Opponent: {opponentName}</div>

      {/* Flex container for board + moves */}
      <div className="flex flex-row gap-6">
        {/* Chessboard */}
        <Chessboard
          key={orientation}
          options={{
            canDragPiece: canDragPieceAll,
            position: chessPosition,
            onPieceDrop,
            boardOrientation: orientation,
            id: "game-board",
          }}
        />

        {/* Moves list */}
        <div className="w-48 bg-gray-100 p-4 rounded shadow overflow-y-auto max-h-[400px]">
          <h3 className="text-lg font-bold mb-2">Moves</h3>
          <ol className="list-decimal list-inside space-y-1">
            {moves.map((m, i) => (
              <li key={i} className={m.player === "You" ? "text-blue-600" : "text-red-600"}>
                {m.san} <span className="text-gray-500 text-sm">({m.player})</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className={`text-lg font-bold ${activeColor === playerColor ? "text-green-600" : ""}`}>
        Time: {Math.floor(myTime / 60)}:{String(myTime % 60).padStart(2, "0")}
      </div>
      <div className="text-lg font-semibold text-gray-700">You: {nickname}</div>

      <div className="flex space-x-4">
        <button onClick={offerDraw} className="rounded-lg bg-yellow-500 px-4 py-2 text-white hover:bg-yellow-600">
          Offer Draw
        </button>
        <button onClick={resign} className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700">
          Resign
        </button>
      </div>
    </div>
  );
}
