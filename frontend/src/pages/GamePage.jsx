import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { useUserStore } from "../store/UserStore";
import { Chess } from "chess.js";

function GameOverModal({ winnerName, onGoToDashboard }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-8 rounded-lg shadow-xl text-center">
        <h2 className="text-3xl font-bold mb-4">Game Over</h2>
        <p className="text-xl mb-6">
          {winnerName ? `Winner: ${winnerName}` : "It's a draw!"}
        </p>
        <button
          onClick={onGoToDashboard}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Go to Dashboard
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
  const API_URL = import.meta.env.VITE_API_URL;

  const [whiteId, setWhiteId] = useState(match?.players?.white || null);
  const isWhite = whiteId === userId;
  const playerColor = isWhite ? "w" : "b";
  const orientation = isWhite ? "white" : "black";
  
  const opponentName = isWhite 
    ? (match?.players?.black_nickname || "Opponent") 
    : (match?.players?.white_nickname || "Opponent");

  // chess.js instance
  const chessGameRef = useRef(new Chess());
  const chessGame = chessGameRef.current;
  const [chessPosition, setChessPosition] = useState(chessGame.fen());
  const [moves, setMoves] = useState([]); // each element: {san, player}

    // timer
    const [myTime, setMyTime] = useState(180);
    const [opponentTime, setOpponentTime] = useState(180);
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

      if (msg.event === "sync") {
        chessGame.load(msg.fen);
        setChessPosition(msg.fen);
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

        // If it's not our move, update the board
        if (msg.user_id !== userId) {
          chessGame.move({ from: from, to: to, promotion: promotion });
          setChessPosition(chessGame.fen());
          setMoves((prev) => [...prev, { san: uci, player: "Opponent" }]);
        }

        // Synchronize timers from server
        const currentWhiteId = whiteId || msg.white_id || match?.players?.white;
        if (userId === currentWhiteId) {
          setMyTime(msg.white_time);
          setOpponentTime(msg.black_time);
        } else {
          setMyTime(msg.black_time);
          setOpponentTime(msg.white_time);
        }

        // Update active player color ('w' or 'b')
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
    return () => {
        ws.close();
    };
  }, [gameId, token, whiteId]);

  useEffect(() => {
      if (!activeColor || gameOver) return;

      const interval = setInterval(() => {
        if ((activeColor === "w" && playerColor === "w") || (activeColor === "b" && playerColor === "b")) {
          setMyTime(prev => Math.max(prev - 1, 0));
        } else {
          setOpponentTime(prev => Math.max(prev - 1, 0));
        }
      }, 1000); // every second

      return () => clearInterval(interval);
    }, [activeColor, gameOver, playerColor]);

// Handle piece drop
const onPieceDrop = ({ sourceSquare, targetSquare, promotion }) => {
  if (gameOver) return false;
  try {
    if (!targetSquare) {
      return false;
    }

    // Only add promotion if needed
    const moveObj = promotion
      ? { from: sourceSquare, to: targetSquare, promotion: promotion }
      : { from: sourceSquare, to: targetSquare };

    const move = chessGame.move(moveObj);
    if (move === null) return false;
    
    setChessPosition(chessGame.fen());

    // Send UCI including promotion if exists
    const uci = sourceSquare + targetSquare + (promotion || "");
    setMoves((prev) => [...prev, { san: uci, player: "You" }]);

    // Optimistically switch timer
    setActiveColor(playerColor === "w" ? "b" : "w");

    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ event: "move", uci: uci }));
    }
    return true;

  } catch (err) {
    console.error("Error making move:", err);
    return false;
  }
};

const canDragPieceAll = (piece) => {
  if (gameOver) return false;
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
      {gameOver && (
        <GameOverModal 
          winnerName={gameResult.winnerName} 
          onGoToDashboard={() => navigate("/dashboard")} 
        />
      )}

      <h1 className="text-2xl font-bold">Game {gameId}</h1>

      <div className={`text-lg font-bold ${activeColor !== playerColor ? "text-green-600" : ""}`}>
        Time: {Math.floor(opponentTime / 60)}:{String(Math.floor(opponentTime % 60)).padStart(2, "0")}
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
        Time: {Math.floor(myTime / 60)}:{String(Math.floor(myTime % 60)).padStart(2, "0")}
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
