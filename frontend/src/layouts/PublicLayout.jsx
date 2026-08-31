import {
  Outlet,
  NavLink,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";

import "./PublicLayout.css";


const PublicLayout = () => {
  const {
    user,
    logout,
  } = useAuth();


  const handleLogout = () => {
    logout();
  };


  return (
    <div className="public-layout">

      {/* =====================================================
          SIDEBAR
      ====================================================== */}

      <aside className="public-sidebar">

        <div className="public-brand">
          <h2>
            TA-HOSS
          </h2>

          <span>
            Public Platform
          </span>
        </div>


        {/* =================================================
            USER INFORMATION
        ================================================== */}

        <div className="public-user">

          <div className="public-avatar">
            {user?.photo ? (
              <img
                src={user.photo}
                alt={user.fullname}
              />
            ) : (
              <span>
                {user?.fullname
                  ?.charAt(0)
                  ?.toUpperCase()}
              </span>
            )}
          </div>

          <div>
            <strong>
              {user?.fullname}
            </strong>

            <span>
              @{user?.username}
            </span>
          </div>

        </div>


        {/* =================================================
            NAVIGATION
        ================================================== */}

        <nav className="public-nav">

          <NavLink
            to="/public"
            end
          >
            🏠 Dashboard
          </NavLink>

          <NavLink
            to="/public/feed"
          >
            📰 Feed
          </NavLink>

          <NavLink
            to="/public/people"
          >
            👥 People
          </NavLink>

          <NavLink
            to="/public/messages"
          >
            💬 Messages
          </NavLink>

          <NavLink
            to="/public/notifications"
          >
            🔔 Notifications
          </NavLink>

          <NavLink
            to="/public/profile"
          >
            👤 Profile
          </NavLink>

        </nav>


        {/* =================================================
            SUPER ADMIN ACCESS
        ================================================== */}

        {user?.role === "super_admin" && (
          <div className="admin-interface-switch">

            <NavLink
              to="/"
              className="community-switch"
            >
              🏘️ Community Dashboard
            </NavLink>

          </div>
        )}


        {/* =================================================
            LOGOUT
        ================================================== */}

        <button
          className="public-logout-btn"
          onClick={handleLogout}
        >
          Logout
        </button>

      </aside>


      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <main className="public-main">

        <Outlet />

      </main>

    </div>
  );
};


export default PublicLayout;