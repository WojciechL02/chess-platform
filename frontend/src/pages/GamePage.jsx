import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { useUserStore } from "../store/UserStore";
import { Chess } from "chess.js";

function GameOverModal({ winnerName, onGoToDashboard }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#262421] p-10 rounded border border-[#403d39] shadow-2xl text-center max-w-sm w-full">
        <div className="mb-6 flex justify-center">
            <svg viewBox="0 0 24 24" className="w-20 h-20 text-[#81b64c]" fill="currentColor">
                <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.49 1.5 1.74 2.65 3.3 2.94L11 18H9v2h6v-2h-2l.31-4.12c1.56-.29 2.81-1.44 3.3-2.94C19.08 10.63 21 8.55 21 8V7c0-1.1-.9-2-2-2zm-2 5.82V7h2v1c0 .5-.13 1-.36 1.45-.18.33-.4.63-.64.37zM5 8V7h2v3.82c-.24.26-.46-.04-.64-.37C4.13 10 4 9.5 4 9V8z"/>
            </svg>
        </div>
        <h2 className="text-4xl font-black text-white mb-2 italic">GAME OVER</h2>
        <p className="text-xl text-[#bababa] mb-8 font-semibold">
          {winnerName ? (
            <span><span className="text-[#81b64c] font-black uppercase">{winnerName}</span> WON</span>
          ) : (
            "IT'S A DRAW"
          )}
        </p>
        <button
          onClick={onGoToDashboard}
          className="w-full bg-[#81b64c] text-white px-6 py-4 rounded font-black text-xl hover:bg-[#a3d160] transition-all shadow-[0_0.25rem_0_#537131] active:translate-y-1 active:shadow-none"
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

  const chessGameRef = useRef(new Chess());
  const chessGame = chessGameRef.current;
  const [chessPosition, setChessPosition] = useState(chessGame.fen());
  const [moves, setMoves] = useState([]); 

    const [myTime, setMyTime] = useState(180);
    const [opponentTime, setOpponentTime] = useState(180);
    const [activeColor, setActiveColor] = useState("w");

  useEffect(() => {
    const wsUrl = `${API_URL.replace("http", "ws")}/game/${gameId}?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setLoading(false);
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
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

        if (msg.user_id !== userId) {
          chessGame.move({ from: from, to: to, promotion: promotion });
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
    return () => {
        ws.close();
    };
  }, [gameId, token, whiteId, API_URL, chessGame, match?.players?.white, userId]);

  useEffect(() => {
      if (!activeColor || gameOver) return;

      const interval = setInterval(() => {
        if ((activeColor === "w" && playerColor === "w") || (activeColor === "b" && playerColor === "b")) {
          setMyTime(prev => Math.max(prev - 1, 0));
        } else {
          setOpponentTime(prev => Math.max(prev - 1, 0));
        }
      }, 1000);

      return () => clearInterval(interval);
    }, [activeColor, gameOver, playerColor]);

const onPieceDrop = ({ sourceSquare, targetSquare, promotion }) => {
  if (gameOver) return false;
  try {
    if (!targetSquare) {
      return false;
    }

    const moveObj = promotion
      ? { from: sourceSquare, to: targetSquare, promotion: promotion }
      : { from: sourceSquare, to: targetSquare };

    const move = chessGame.move(moveObj);
    if (move === null) return false;
    
    setChessPosition(chessGame.fen());
    const uci = sourceSquare + targetSquare + (promotion || "");
    setMoves((prev) => [...prev, { san: uci, player: "You" }]);
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center mt-40">
        <div className="w-12 h-12 border-4 border-[#81b64c] border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-white font-bold">Connecting to game...</div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#302e2b] p-6 flex flex-col items-center">
      {gameOver && (
        <GameOverModal 
          winnerName={gameResult.winnerName} 
          onGoToDashboard={() => navigate("/dashboard")} 
        />
      )}

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Board Section */}
        <div className="lg:col-span-3 flex flex-col items-center">
             {/* Opponent Info */}
            <div className="w-full max-w-[600px] flex justify-between items-center mb-2 px-2">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-[#262421] rounded flex items-center justify-center border border-[#403d39]">
                        <span className="text-xs font-bold text-[#bababa] uppercase">{opponentName.charAt(0)}</span>
                    </div>
                    <span className="font-bold text-white">{opponentName}</span>
                </div>
                <div className={`px-4 py-1.5 rounded font-mono text-xl font-bold ${activeColor !== playerColor ? "bg-white text-black" : "bg-[#262421] text-[#bababa] border border-[#403d39]"}`}>
                    {Math.floor(opponentTime / 60)}:{String(Math.floor(opponentTime % 60)).padStart(2, "0")}
                </div>
            </div>

            {/* Chessboard */}
            <div className="w-full max-w-[600px] aspect-square shadow-2xl border-4 border-[#262421] rounded overflow-hidden">
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
            </div>

            {/* My Info */}
            <div className="w-full max-w-[600px] flex justify-between items-center mt-2 px-2">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-[#81b64c] rounded flex items-center justify-center">
                        <span className="text-xs font-bold text-white uppercase">{nickname?.charAt(0)}</span>
                    </div>
                    <span className="font-bold text-white">{nickname} (You)</span>
                </div>
                <div className={`px-4 py-1.5 rounded font-mono text-xl font-bold ${activeColor === playerColor ? "bg-white text-black" : "bg-[#262421] text-[#bababa] border border-[#403d39]"}`}>
                    {Math.floor(myTime / 60)}:{String(Math.floor(myTime % 60)).padStart(2, "0")}
                </div>
            </div>
        </div>

        {/* Sidebar Info */}
        <div className="lg:col-span-1 flex flex-col space-y-6">
            <div className="bg-[#262421] rounded border border-[#403d39] overflow-hidden flex flex-col h-[500px]">
                <div className="bg-[#21201d] px-4 py-3 border-b border-[#403d39]">
                    <h3 className="text-sm font-black text-[#bababa] uppercase tracking-widest">Move History</h3>
                </div>
                <div className="flex-grow overflow-y-auto p-2">
                     <div className="grid grid-cols-2 gap-1">
                        {moves.reduce((acc, move, i) => {
                            if (i % 2 === 0) acc.push([move]);
                            else acc[acc.length - 1].push(move);
                            return acc;
                        }, []).map((pair, i) => (
                            <div key={i} className="contents">
                                <div className="col-span-2 flex items-center space-x-2 py-1 px-2 hover:bg-[#3c3934] rounded group">
                                    <span className="text-[#bababa] text-xs font-bold w-4">{i + 1}.</span>
                                    <span className="flex-1 font-semibold text-white">{pair[0].san}</span>
                                    <span className="flex-1 font-semibold text-white">{pair[1]?.san || ""}</span>
                                </div>
                            </div>
                        ))}
                     </div>
                </div>
                <div className="p-4 bg-[#21201d] border-t border-[#403d39] grid grid-cols-2 gap-3">
                    <button 
                        onClick={offerDraw} 
                        className="bg-[#3c3934] text-[#bababa] text-xs font-bold py-2 rounded hover:text-white hover:bg-[#4a4742] transition-colors"
                    >
                        OFFER DRAW
                    </button>
                    <button 
                        onClick={resign} 
                        className="bg-[#3c3934] text-[#bababa] text-xs font-bold py-2 rounded hover:text-white hover:bg-[#4a4742] transition-colors"
                    >
                        RESIGN
                    </button>
                </div>
            </div>

            <div className="bg-[#262421] p-4 rounded border border-[#403d39]">
                <p className="text-[#bababa] text-xs font-semibold leading-relaxed">
                    Game ID: <span className="text-white font-mono">{gameId}</span><br/>
                    Format: <span className="text-white capitalize">{match?.format || "Standard"}</span>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}
