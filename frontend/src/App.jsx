import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import {
  AuthProvider,
  useAuth,
} from "./context/AuthContext";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedLayout from "./layouts/ProtectedLayout";

import CommunityMapPage from "./pages/CommunityMapPage";
import HouseholdDetailsPage from "./pages/HouseholdDetailsPage";
import RelationshipTreePage from "./pages/RelationshipTreePage";
import ResidentProfilePage from "./pages/ResidentProfilePage";

import ResidentsPage from "./pages/ResidentsPage";
import ResidentRegistrationPage from "./pages/ResidentRegistrationPage";

import IdentityPage from "./pages/IdentityPage";
import ResidentIdentityPage from "./pages/ResidentIdentityPage";
import ResidentQRPage from "./pages/ResidentQRPage";
import VerificationPage from "./pages/VerificationPage";
import IDCardsPage from "./pages/IDCardsPage";
import ResidentIDCardPage from "./pages/ResidentIDCardPage";
import UsersPage from "./pages/UsersPage";
import ProfilePage from "./pages/ProfilePage";
import ResidentEditPage from "./pages/ResidentEditPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AIAssistantPage from "./pages/AIAssistantPage";

// IMPORT AI CHAT WIDGET
import AIChatWidget from "./components/AIChatWidget";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// RENDER WIDGET ONLY FOR AUTHENTICATED USERS
const AuthenticatedWidget = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  return <AIChatWidget />;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/login" element={<Login />} />

      {/* PROTECTED */}
      <Route
        element={
          <ProtectedRoute>
            <ProtectedLayout />
          </ProtectedRoute>
        }
      >
        {/* DASHBOARD */}
        <Route path="/" element={<Dashboard />} />

        {/* HOUSEHOLDS */}
        <Route
          path="/households/:id"
          element={<HouseholdDetailsPage />}
        />
        <Route
          path="/households/:id/tree"
          element={<RelationshipTreePage />}
        />

        {/* RESIDENTS */}
        <Route path="/residents" element={<ResidentsPage />} />
        <Route
          path="/residents/register"
          element={<ResidentRegistrationPage />}
        />
        <Route
          path="/resident/:id"
          element={<ResidentProfilePage />}
        />
        <Route
          path="/resident/:id/edit"
          element={<ResidentEditPage />}
        />

        {/* VERIFICATION */}
        <Route
          path="/verification"
          element={<VerificationPage />}
        />

        {/* RESIDENT IDENTITY */}
        <Route
          path="/resident/:id/identity"
          element={<ResidentIdentityPage />}
        />
        <Route
          path="/resident/:id/qr"
          element={<ResidentQRPage />}
        />
        <Route
          path="/resident/:id/id-card"
          element={<ResidentIDCardPage />}
        />

        {/* IDENTITY & QR */}
        <Route path="/identity" element={<IdentityPage />} />

        {/* COMMUNITY MAP */}
        <Route path="/map" element={<CommunityMapPage />} />

        {/* REMAINING MODULES */}
        <Route path="/id-cards" element={<IDCardsPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/ai-assistant" element={<AIAssistantPage />} />
      </Route>

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />

        {/* FLOATING AI CHAT WIDGET */}
        <AuthenticatedWidget />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;