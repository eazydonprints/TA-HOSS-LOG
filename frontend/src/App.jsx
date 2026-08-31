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


/* =========================================================
   AUTHENTICATION
========================================================= */

import Login from "./pages/Login";


/* =========================================================
   COMMUNITY LAYOUT
========================================================= */

import ProtectedLayout from "./layouts/ProtectedLayout";


/* =========================================================
   COMMUNITY PAGES
========================================================= */

import Dashboard from "./pages/Dashboard";

import HouseholdRegistrationPage
  from "./pages/HouseholdRegistrationPage";

import HouseholdDetailsPage
  from "./pages/HouseholdDetailsPage";

import RelationshipTreePage
  from "./pages/RelationshipTreePage";

import CommunityMapPage
  from "./pages/CommunityMapPage";


/* =========================================================
   RESIDENTS
========================================================= */

import ResidentsPage
  from "./pages/ResidentsPage";

import ResidentRegistrationPage
  from "./pages/ResidentRegistrationPage";

import ResidentProfilePage
  from "./pages/ResidentProfilePage";

import ResidentEditPage
  from "./pages/ResidentEditPage";


/* =========================================================
   VERIFICATION
========================================================= */

import VerificationPage
  from "./pages/VerificationPage";


/* =========================================================
   IDENTITY
========================================================= */

import IdentityPage
  from "./pages/IdentityPage";

import ResidentIdentityPage
  from "./pages/ResidentIdentityPage";

import ResidentQRPage
  from "./pages/ResidentQRPage";

import IDCardsPage
  from "./pages/IDCardsPage";

import ResidentIDCardPage
  from "./pages/ResidentIDCardPage";


/* =========================================================
   ADMINISTRATION
========================================================= */

import UsersPage
  from "./pages/UsersPage";

import ProfilePage
  from "./pages/ProfilePage";

import AnalyticsPage
  from "./pages/AnalyticsPage";

import AIAssistantPage
  from "./pages/AIAssistantPage";

import SystemSettingsPage
  from "./pages/SystemSettingsPage";


/* =========================================================
   AI CHAT WIDGET
========================================================= */

import AIChatWidget
  from "./components/AIChatWidget";


/* =========================================================
   PROTECTED ROUTE
========================================================= */

const ProtectedRoute = ({
  children,
}) => {

  const {
    isAuthenticated,
    loading,
  } = useAuth();


  /*
   * Wait for AuthContext to finish
   * checking the stored session.
   */

  if (loading) {

    return (
      <div className="auth-loading">
        Loading...
      </div>
    );

  }


  /*
   * User is not authenticated.
   */

  if (!isAuthenticated) {

    return (
      <Navigate
        to="/login"
        replace
      />
    );

  }


  return children;

};


/* =========================================================
   SUPER ADMIN ROUTE
========================================================= */

const SuperAdminRoute = ({
  children,
}) => {

  const {
    user,
    loading,
  } = useAuth();


  if (loading) {

    return (
      <div className="auth-loading">
        Loading...
      </div>
    );

  }


  const normalizedRole =
    String(
      user?.role || ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /[\s-]+/g,
        "_"
      );


  if (
    normalizedRole !==
    "super_admin"
  ) {

    return (
      <Navigate
        to="/"
        replace
      />
    );

  }


  return children;

};


/* =========================================================
   AUTHENTICATED AI WIDGET
========================================================= */

const AuthenticatedWidget = () => {

  const {
    isAuthenticated,
  } = useAuth();


  if (!isAuthenticated) {
    return null;
  }


  return <AIChatWidget />;

};


/* =========================================================
   APPLICATION ROUTES
========================================================= */

const AppRoutes = () => {

  return (

    <Routes>


      {/* ===================================================
          LOGIN
      ==================================================== */}

      <Route
        path="/login"
        element={
          <Login />
        }
      />


      {/* ===================================================
          PROTECTED COMMUNITY APPLICATION
      ==================================================== */}

      <Route
        element={
          <ProtectedRoute>
            <ProtectedLayout />
          </ProtectedRoute>
        }
      >


        {/* ================================================
            DASHBOARD
        ================================================= */}

        <Route
          path="/"
          element={
            <Dashboard />
          }
        />


        {/* ================================================
            HOUSEHOLDS

            IMPORTANT:
            /households/register MUST COME BEFORE
            /households/:id
        ================================================= */}

        <Route
          path="/households/register"
          element={
            <HouseholdRegistrationPage />
          }
        />

        <Route
          path="/households/:id/tree"
          element={
            <RelationshipTreePage />
          }
        />

        <Route
          path="/households/:id"
          element={
            <HouseholdDetailsPage />
          }
        />


        {/* ================================================
            RESIDENTS
        ================================================= */}

        <Route
          path="/residents"
          element={
            <ResidentsPage />
          }
        />

        <Route
          path="/residents/register"
          element={
            <ResidentRegistrationPage />
          }
        />

        <Route
          path="/resident/:id/edit"
          element={
            <ResidentEditPage />
          }
        />

        <Route
          path="/resident/:id"
          element={
            <ResidentProfilePage />
          }
        />


        {/* ================================================
            VERIFICATION
        ================================================= */}

        <Route
          path="/verification"
          element={
            <VerificationPage />
          }
        />


        {/* ================================================
            COMMUNITY MAP
        ================================================= */}

        <Route
          path="/map"
          element={
            <CommunityMapPage />
          }
        />


        {/* ================================================
            IDENTITY
        ================================================= */}

        <Route
          path="/identity"
          element={
            <IdentityPage />
          }
        />

        <Route
          path="/resident/:id/identity"
          element={
            <ResidentIdentityPage />
          }
        />

        <Route
          path="/resident/:id/qr"
          element={
            <ResidentQRPage />
          }
        />


        {/* ================================================
            ID CARDS
        ================================================= */}

        <Route
          path="/id-cards"
          element={
            <IDCardsPage />
          }
        />

        <Route
          path="/resident/:id/id-card"
          element={
            <ResidentIDCardPage />
          }
        />


        {/* ================================================
            PROFILE
        ================================================= */}

        <Route
          path="/profile"
          element={
            <ProfilePage />
          }
        />


        {/* ================================================
            ANALYTICS
        ================================================= */}

        <Route
          path="/analytics"
          element={
            <AnalyticsPage />
          }
        />


        {/* ================================================
            AI ASSISTANT
        ================================================= */}

        <Route
          path="/ai-assistant"
          element={
            <AIAssistantPage />
          }
        />


        {/* ================================================
            USER MANAGEMENT
        ================================================= */}

        <Route
          path="/users"
          element={
            <SuperAdminRoute>
              <UsersPage />
            </SuperAdminRoute>
          }
        />


        {/* ================================================
            SYSTEM SETTINGS
        ================================================= */}

        <Route
          path="/system-settings"
          element={
            <SuperAdminRoute>
              <SystemSettingsPage />
            </SuperAdminRoute>
          }
        />

      </Route>


      {/* ===================================================
          FALLBACK
      ==================================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />

    </Routes>

  );

};


/* =========================================================
   APPLICATION ROOT
========================================================= */

const App = () => {

  return (

    <BrowserRouter>

      <AuthProvider>

        <AppRoutes />

        <AuthenticatedWidget />

      </AuthProvider>

    </BrowserRouter>

  );

};


export default App;