import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import GamePage from "./pages/GamePage";
import Statistics from "./pages/Statistics";
import Analysis from "./pages/Analysis";
import Navbar from "./components/Navbar";


function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#302e2b] text-white">
        <Navbar />
        <main className="pt-14">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/game/:gameId" element={<GamePage />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/analysis/:gameId" element={<Analysis />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App
