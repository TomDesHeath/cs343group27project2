import "./App.css";
import { Routes, Route } from "react-router-dom";
import Lobby from "./componenets/Lobby";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";
import Login from "./auth/Login.jsx";
import Register from "./auth/Register.jsx";
import Profile from "./pages/Profile.jsx";
import Nav from "./componenets/Nav.jsx";
import Landing from "./componenets/Landing.jsx";
import LeaderboardPage from "./componenets/Leaderboard.jsx";
import MatchPlay from "./componenets/MatchPlay.jsx";
import MatchCreator from "./componenets/MatchCreator.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";

export default function App() {
  return (
    <div className="">
      <Nav />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/login"
          element={(
            <div>
              <Login />
            </div>
          )}
        />
        <Route
          path="/register"
          element={(
            <div>
              <Register />
            </div>
          )}
        />
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route element={<ProtectedRoute requiresAdmin />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/matchmaking" element={<div>Matchmaking queue</div>} />
        <Route path="/join" element={<div>Join a match</div>} />
        <Route path="/create" element={<MatchCreator />} />
        <Route path="/matches" element={<div>My Matches</div>} />
        <Route path="/play" element={<MatchPlay />} />
        <Route path="*" element={<div className="p-4">Page not found</div>} />
      </Routes>
    </div>
  );
}
