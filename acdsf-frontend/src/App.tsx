import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CommandLayout } from './layouts/CommandLayout';
import { ProtectedRoute } from './layouts/ProtectedRoute';
import { AuthPage } from './pages/Auth';
import { Landing } from './pages/Landing';
import { CommandCenter } from './pages/CommandCenter';
import { Battlefield } from './pages/Battlefield';
import { DigitalTwin } from './pages/DigitalTwin';
import { ThreatIntel } from './pages/ThreatIntel';
import { XaiInsights } from './pages/XaiInsights';
import { IncidentCenter } from './pages/IncidentCenter';
import { SimulationBattle } from './pages/SimulationBattle';
import { AiDefence, Analytics, SettingsPage, Topology } from './pages/OpsPages';
import { AttackReport } from './pages/AttackReport';
import { AdminDashboard, AnalystDashboard, BlueTeamDashboard, RedTeamDashboard } from './pages/RoleDashboards';
import { UsersPage } from './pages/UsersPage';
import { ProfilePage } from './pages/ProfilePage';
import { ToastContainer } from './components/ui/Toast';

export default function App() {
  return (
    <AuthProvider>
      <ToastContainer />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<AuthPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<CommandLayout />}>
              <Route index element={<Navigate to="command-center" replace />} />
              <Route path="command-center" element={<CommandCenter />} />
              <Route path="simulation" element={<SimulationBattle />} />
              <Route path="battlefield" element={<SimulationBattle />} />
              <Route path="digital-twin" element={<DigitalTwin />} />
              <Route path="threat-intelligence" element={<ThreatIntel />} />
              <Route path="topology" element={<Topology />} />
              <Route path="ai-defence" element={<AiDefence />} />
              <Route path="xai-insights" element={<XaiInsights />} />
              <Route path="incidents" element={<IncidentCenter />} />
              <Route path="attack-report" element={<AttackReport />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="analyst" element={<AnalystDashboard />} />
              <Route path="red-team" element={<RedTeamDashboard />} />
              <Route path="blue-team" element={<BlueTeamDashboard />} />
              {/* New production pages */}
              <Route path="users" element={<UsersPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
