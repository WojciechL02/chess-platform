import { useState } from 'react'
import './App.css'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import GamePage from "./pages/GamePage";
import Statistics from "./pages/Statistics";


function App() {
  const [count, setCount] = useState(0)

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/game/:gameId" element={<GamePage />} />
          <Route path="/statistics" element={<Statistics />} />
      </Routes>
    </Router>
  );
}

export default App
