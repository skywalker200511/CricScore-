import { Routes, Route } from 'react-router-dom';

// Viewer
import ViewerLayout from './layouts/ViewerLayout.jsx';
import ViewerHomePage from './pages/viewer/ViewerHomePage.jsx';
import ViewerStatsPage from './pages/viewer/ViewerStatsPage.jsx';
import ViewerTeamsPage from './pages/viewer/ViewerTeamsPage.jsx';
import ViewerMatchPage from './pages/viewer/ViewerMatchPage.jsx';

import ViewerScorecardPage from './pages/viewer/ViewerScorecardPage.jsx';

// Scorer
import ScorerLayout from './layouts/ScorerLayout.jsx';
import HomePage from './pages/HomePage.jsx';
import TeamSelectPage from './pages/TeamSelectPage.jsx';
import LiveScorerPage from './pages/LiveScorerPage.jsx';
import ScorecardPage from './pages/ScorecardPage.jsx';

export default function App() {
  return (
    <Routes>
      {/* Public Viewer Routes */}
      <Route element={<ViewerLayout />}>
        <Route path="/" element={<ViewerHomePage />} />
        <Route path="/stats" element={<ViewerStatsPage />} />
        <Route path="/teams" element={<ViewerTeamsPage />} />
        <Route path="/match/:matchId" element={<ViewerMatchPage />} />
        <Route path="/match/:matchId/scorecard" element={<ViewerScorecardPage />} />
      </Route>

      {/* Protected Scorer Routes */}
      <Route path="/scorer" element={<ScorerLayout />}>
        <Route index element={<HomePage />} />
        <Route path="team-select" element={<TeamSelectPage />} />
        <Route path=":matchId" element={<LiveScorerPage />} />
        <Route path="scorecard/:matchId" element={<ScorecardPage />} />
      </Route>
    </Routes>
  );
}
