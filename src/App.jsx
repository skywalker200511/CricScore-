import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import TeamSelectPage from './pages/TeamSelectPage.jsx'
import LiveScorerPage from './pages/LiveScorerPage.jsx'
import ScorecardPage from './pages/ScorecardPage.jsx'

export default function App() {
  return (
    <div className="min-h-dvh bg-surface">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/team-select" element={<TeamSelectPage />} />
        <Route path="/scorer/:matchId" element={<LiveScorerPage />} />
        <Route path="/scorecard/:matchId" element={<ScorecardPage />} />
      </Routes>
    </div>
  )
}
