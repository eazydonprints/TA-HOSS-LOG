import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";

import { useState } from "react";

import { useAuth } from "../context/AuthContext";


/* =========================================================
   BASE NAVIGATION
========================================================= */

const menuSections = [
  {
    title: "MAIN",

    items: [
      {
        label: "Dashboard",
        path: "/",
        icon: "▦",
      },
    ],
  },

  {
    title: "REGISTER",

    items: [
      {
        label: "Households",
        path: "/households",
        icon: "⌂",
      },

      {
        label: "Residents",
        path: "/residents",
        icon: "♙",
      },

      {
        label: "Verification",
        path: "/verification",
        icon: "✓",
      },
    ],
  },

  {
    title: "COMMUNITY",

    items: [
      {
        label: "GPS Map",
        path: "/map",
        icon: "⌖",
      },

      {
        label: "Family Tree",
        path: "/households",
        icon: "♧",
      },
    ],
  },

  {
    title: "IDENTITY",

    items: [
      {
        label: "Identity & QR",
        path: "/identity",
        icon: "▣",
      },

      {
        label: "ID Cards",
        path: "/id-cards",
        icon: "▤",
      },
    ],
  },

  {
    title: "INSIGHTS",

    items: [
      {
        label: "Analytics",
        path: "/analytics",
        icon: "◫",
      },

      {
        label: "AI Assistant",
        path: "/ai-assistant",
        icon: "✦",
      },
    ],
  },
];


/* =========================================================
   PROTECTED LAYOUT
========================================================= */

const ProtectedLayout = () => {
  const {
    user,
    logout,
  } = useAuth();

  const navigate = useNavigate();

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);


  /* =======================================================
     ROLE HELPERS
  ======================================================== */

  const normalizedRole = String(
    user?.role || ""
  )
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");


  const isSuperAdmin =
    normalizedRole === "super_admin";


  const isRegistrationOfficer =
    normalizedRole === "registration_officer";


  const isVerificationOfficer =
    normalizedRole === "verification_officer";


  const isViewer =
    normalizedRole === "viewer";


  /* =======================================================
     CLOSE MOBILE SIDEBAR
  ======================================================== */

  const closeMobileSidebar = () => {
    setMobileOpen(false);
  };


  /* =======================================================
     LOGOUT
  ======================================================== */

  const handleLogout = () => {
    logout();

    navigate(
      "/login",
      {
        replace: true,
      }
    );
  };


  /* =======================================================
     PROFILE NAVIGATION
  ======================================================== */

  const handleProfileClick = () => {
    closeMobileSidebar();

    navigate("/profile");
  };


  /* =======================================================
     ADMINISTRATION NAVIGATION
  ======================================================== */

  const administrationSection = {
    title: "ADMINISTRATION",

    items: [
      {
        label: "User Management",
        path: "/users",
        icon: "♟",
      },
    ],
  };


  /* =======================================================
     BUILD NAVIGATION
  ======================================================== */

  const visibleSections = [
    ...menuSections,

    ...(isSuperAdmin
      ? [administrationSection]
      : []),
  ];


  return (
    <div className="app-shell">


      {/* =====================================================
          MOBILE OVERLAY
      ====================================================== */}

      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={closeMobileSidebar}
        />
      )}


      {/* =====================================================
          SIDEBAR
      ====================================================== */}

      <aside
        className={`sidebar ${
          mobileOpen
            ? "sidebar-open"
            : ""
        }`}
      >


        {/* =================================================
    BRAND
================================================== */}

<div className="sidebar-brand">

  <div className="brand-logo">
    <img
      src="/ta-hoss-logo.png"
      alt="TA-HOSS LOG"
    />
  </div>

  <div>
    <strong>
      TA-HOSS LOG
    </strong>

    <span>
      Community MIS Register
    </span>
  </div>

</div>


        {/* =================================================
            COMMUNITY
        ================================================== */}

        <div className="sidebar-community">

          <span className="status-dot" />

          <div>
            <strong>
              Ta-hoss Community
            </strong>

            <small>
              Riyom, Plateau State
            </small>
          </div>

        </div>


        {/* =================================================
            NAVIGATION
        ================================================== */}

        <nav className="sidebar-nav">

          {visibleSections.map(
            (section) => (
              <div
                className={`nav-section ${
                  section.title ===
                  "ADMINISTRATION"
                    ? "admin-nav-section"
                    : ""
                }`}
                key={
                  section.title
                }
              >

                <div className="nav-section-title">
                  {
                    section.title
                  }
                </div>


                {section.items.map(
                  (item) => (
                    <NavLink
                      key={
                        `${item.label}-${item.path}`
                      }
                      to={
                        item.path
                      }
                      end={
                        item.path ===
                        "/"
                      }
                      className={({
                        isActive,
                      }) =>
                        `nav-link ${
                          isActive
                            ? "active"
                            : ""
                        }`
                      }
                      onClick={
                        closeMobileSidebar
                      }
                    >

                      <span className="nav-icon">
                        {
                          item.icon
                        }
                      </span>

                      <span>
                        {
                          item.label
                        }
                      </span>

                      {item.label ===
                        "User Management" && (
                        <span className="admin-nav-badge">
                          ADMIN
                        </span>
                      )}

                    </NavLink>
                  )
                )}

              </div>
            )
          )}


          {/* =================================================
              QUICK PROFILE
          ================================================== */}

          <div className="sidebar-profile-shortcut">

            <button
              type="button"
              onClick={
                handleProfileClick
              }
              className="sidebar-profile-button"
            >

              <div className="sidebar-profile-avatar">

                {user?.photo ? (
                  <img
                    src={
                      user.photo
                    }
                    alt={
                      user?.fullname ||
                      "User"
                    }
                  />
                ) : (
                  user?.fullname
                    ?.charAt(0)
                    ?.toUpperCase() ||
                  "A"
                )}

              </div>


              <div className="sidebar-profile-info">

                <strong>
                  {
                    user?.fullname ||
                    "Administrator"
                  }
                </strong>

                <span>
                  {
                    user?.role ||
                    "viewer"
                  }
                </span>

              </div>


              <span className="sidebar-profile-arrow">
                →
              </span>

            </button>

          </div>

        </nav>


        {/* =================================================
            SIDEBAR BOTTOM
        ================================================== */}

        <div className="sidebar-bottom">

          <button
            className="logout-button"
            onClick={
              handleLogout
            }
          >

            <span>
              ↪
            </span>

            Sign out

          </button>

        </div>

      </aside>


      {/* =====================================================
          MAIN AREA
      ====================================================== */}

      <div className="main-area">


        {/* =================================================
            TOPBAR
        ================================================== */}

        <header className="topbar">


          {/* MOBILE MENU */}

          <button
            className="mobile-menu-button"
            onClick={() =>
              setMobileOpen(
                true
              )
            }
            aria-label="Open navigation"
          >
            ☰
          </button>


          {/* TITLE */}

          <div className="topbar-title">
            TA-HOSS Community Management
          </div>


          {/* USER */}

          <div className="topbar-user">


            {/* NOTIFICATION */}

            <div
              className="notification"
              title="Notifications"
            >
              ♢
            </div>


            {/* PROFILE */}

            <button
              type="button"
              className="topbar-profile-button"
              onClick={
                handleProfileClick
              }
              title="Open profile"
            >

              <div className="user-avatar">

                {user?.photo ? (
                  <img
                    src={
                      user.photo
                    }
                    alt={
                      user?.fullname ||
                      "User"
                    }
                  />
                ) : (
                  user?.fullname
                    ?.charAt(0)
                    ?.toUpperCase() ||
                  "A"
                )}

              </div>


              <div className="user-details">

                <strong>
                  {
                    user?.fullname ||
                    "Administrator"
                  }
                </strong>

                <span>
                  {
                    user?.role ||
                    "viewer"
                  }
                </span>

              </div>

            </button>

          </div>

        </header>


        {/* =================================================
            PAGE CONTENT
        ================================================== */}

        <main className="content-area">

          <Outlet />

        </main>

      </div>

    </div>
  );
};


export default ProtectedLayout;