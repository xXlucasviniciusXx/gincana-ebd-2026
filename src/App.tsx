import { Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from './components/PublicLayout';
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import RankingPage from './pages/RankingPage';
import TeamsListPage from './pages/TeamsListPage';
import TeamDetailPage from './pages/TeamDetailPage';
import WeeksListPage from './pages/WeeksListPage';
import WeekDetailPage from './pages/WeekDetailPage';
import NewsPage from './pages/NewsPage';
import ChampionPage from './pages/ChampionPage';
import LoginPage from './pages/admin/LoginPage';
import DashboardPage from './pages/admin/DashboardPage';
import TeamsPage from './pages/admin/TeamsPage';
import MembersPage from './pages/admin/MembersPage';
import WeeksPage from './pages/admin/WeeksPage';
import ActivitiesPage from './pages/admin/ActivitiesPage';
import ScoresPage from './pages/admin/ScoresPage';
import QuickScoringPage from './pages/admin/QuickScoringPage';
import GalleryPage from './pages/admin/GalleryPage';
import SettingsPage from './pages/admin/SettingsPage';
import AnnouncementsPage from './pages/admin/AnnouncementsPage';
import ChurchesPage from './pages/admin/ChurchesPage';
import EscapePage from './pages/admin/EscapePage';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<RankingPage />} />
        <Route path="equipes" element={<TeamsListPage />} />
        <Route path="equipes/:teamId" element={<TeamDetailPage />} />
        <Route path="semanas" element={<WeeksListPage />} />
        <Route path="semanas/:weekId" element={<WeekDetailPage />} />
        <Route path="novidades" element={<NewsPage />} />
        <Route path="campea" element={<ChampionPage />} />
      </Route>

      <Route path="admin/login" element={<LoginPage />} />

      <Route
        path="admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="igrejas" element={<ChurchesPage />} />
        <Route path="equipes" element={<TeamsPage />} />
        <Route path="integrantes" element={<MembersPage />} />
        <Route path="semanas" element={<WeeksPage />} />
        <Route path="atividades" element={<ActivitiesPage />} />
        <Route path="pontuacoes" element={<ScoresPage />} />
        <Route path="lancamento-rapido" element={<QuickScoringPage />} />
        <Route path="galeria" element={<GalleryPage />} />
        <Route path="escape" element={<EscapePage />} />
        <Route path="configuracoes" element={<SettingsPage />} />
        <Route path="avisos" element={<AnnouncementsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
