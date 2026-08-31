import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useAuth } from "../context/AuthContext";


/* =========================================================
   COMMUNITY NAVIGATION
========================================================= */

const menuSections = [
  {
    title: "MAIN",

    items: [
      {
        label: "Dashboard",
        path: "/",
        icon: "▦",
        end: true,
      },
    ],
  },

  {
    title: "REGISTER",

    items: [
      {
        label: "Households",
        path: "/households/register",
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

      /*
       * There is currently no standalone:
       *
       * /households
       *
       * page in App.jsx.
       *
       * Relationship Tree requires a specific
       * household ID:
       *
       * /households/:id/tree
       *
       * Therefore the sidebar entry opens the
       * Household registration area rather than
       * sending the user to a non-existent route.
       */
      {
        label: "Family Tree",
        path: "/households/register",
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
   PROTECTED COMMUNITY LAYOUT
========================================================= */

const ProtectedLayout = () => {

  const {
    user,
    logout,
  } = useAuth();

  const navigate = useNavigate();


  /* =======================================================
     MOBILE SIDEBAR
  ======================================================== */

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);


  /* =======================================================
     PROFILE MENU
  ======================================================== */

  const [
    profileMenuOpen,
    setProfileMenuOpen,
  ] = useState(false);


  /* =======================================================
     THEME
  ======================================================== */

  const [
    theme,
    setTheme,
  ] = useState(() => {

    const savedTheme =
      localStorage.getItem(
        "ta-hoss-theme"
      );

    if (
      savedTheme === "light" ||
      savedTheme === "dark"
    ) {
      return savedTheme;
    }

    return "light";

  });


  /* =======================================================
     PROFILE MENU REF
  ======================================================== */

  const profileMenuRef =
    useRef(null);


  /* =======================================================
     APPLY THEME
  ======================================================== */

  useEffect(() => {

    document.documentElement.setAttribute(
      "data-theme",
      theme
    );

    localStorage.setItem(
      "ta-hoss-theme",
      theme
    );

  }, [theme]);


  /* =======================================================
     TOGGLE THEME
  ======================================================== */

  const toggleTheme = () => {

    setTheme((currentTheme) =>
      currentTheme === "light"
        ? "dark"
        : "light"
    );

  };


  /* =======================================================
     ROLE HELPERS
  ======================================================== */

  const normalizedRole = String(
    user?.role || ""
  )
    .trim()
    .toLowerCase()
    .replace(
      /[\s-]+/g,
      "_"
    );


  const isSuperAdmin =
    normalizedRole === "super_admin";


  /* =======================================================
     CLOSE MOBILE SIDEBAR
  ======================================================== */

  const closeMobileSidebar = () => {

    setMobileOpen(false);

  };


  /* =======================================================
     CLOSE PROFILE MENU
  ======================================================== */

  const closeProfileMenu = () => {

    setProfileMenuOpen(false);

  };


  /* =======================================================
     OUTSIDE CLICK
  ======================================================== */

  useEffect(() => {

    const handleOutsideClick = (
      event
    ) => {

      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(
          event.target
        )
      ) {

        setProfileMenuOpen(false);

      }

    };


    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );


    return () => {

      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

    };

  }, []);


  /* =======================================================
     ESCAPE KEY
  ======================================================== */

  useEffect(() => {

    const handleEscapeKey = (
      event
    ) => {

      if (
        event.key === "Escape"
      ) {

        setProfileMenuOpen(false);
        setMobileOpen(false);

      }

    };


    document.addEventListener(
      "keydown",
      handleEscapeKey
    );


    return () => {

      document.removeEventListener(
        "keydown",
        handleEscapeKey
      );

    };

  }, []);


  /* =======================================================
     LOGOUT
  ======================================================== */

  const handleLogout = () => {

    closeProfileMenu();
    closeMobileSidebar();

    logout();

    navigate(
      "/login",
      {
        replace: true,
      }
    );

  };


  /* =======================================================
     NAVIGATION HELPER
  ======================================================== */

  const handleNavigate = (
    path
  ) => {

    closeMobileSidebar();
    closeProfileMenu();

    navigate(path);

  };


  /* =======================================================
     PROFILE NAVIGATION
  ======================================================== */

  const handleProfileClick = () => {

    handleNavigate(
      "/profile"
    );

  };


  /* =======================================================
     SYSTEM SETTINGS NAVIGATION
  ======================================================== */

  const handleSystemSettingsClick = () => {

    handleNavigate(
      "/system-settings"
    );

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
        adminOnly: true,
      },

      {
        label: "System Settings",
        path: "/system-settings",
        icon: "⚙",
        adminOnly: true,
      },

    ],

  };


  /* =======================================================
     BUILD VISIBLE NAVIGATION
  ======================================================== */

  const visibleSections = [

    ...menuSections,

    ...(isSuperAdmin
      ? [administrationSection]
      : []),

  ];


  /* =======================================================
     RENDER
  ======================================================== */

  return (

    <div className="app-shell">


      {/* =====================================================
          MOBILE OVERLAY
      ====================================================== */}

      {mobileOpen && (

        <div
          className="sidebar-overlay"
          onClick={
            closeMobileSidebar
          }
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


        {/* ===================================================
            BRAND
        ==================================================== */}

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


        {/* ===================================================
            COMMUNITY STATUS
        ==================================================== */}

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


        {/* ===================================================
            NAVIGATION
        ==================================================== */}

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

                  {section.title}

                </div>


                {section.items.map(
                  (item) => (

                    <NavLink
                      key={`${item.label}-${item.path}`}
                      to={item.path}
                      end={
                        item.end === true
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
                      onClick={() => {

                        closeMobileSidebar();
                        closeProfileMenu();

                      }}
                    >

                      <span className="nav-icon">

                        {item.icon}

                      </span>


                      <span>

                        {item.label}

                      </span>


                      {item.adminOnly && (

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
                    src={user.photo}
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

                  {user?.fullname ||
                    "Administrator"}

                </strong>

                <span>

                  {user?.role ||
                    "viewer"}

                </span>

              </div>


              <span className="sidebar-profile-arrow">

                →

              </span>

            </button>

          </div>

        </nav>


        {/* =====================================================
            SIDEBAR BOTTOM
        ====================================================== */}

        <div className="sidebar-bottom">

          <button
            type="button"
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


        {/* ===================================================
            TOPBAR
        ==================================================== */}

        <header className="topbar">


          {/* MOBILE MENU */}

          <button
            type="button"
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


          {/* =================================================
              TOPBAR USER AREA
          ================================================== */}

          <div className="topbar-user">


            {/* NOTIFICATION */}

            <button
              type="button"
              className="notification"
              title="Notifications"
              aria-label="Notifications"
            >

              ♢

            </button>


            {/* =================================================
                THEME TOGGLE
            ================================================== */}

            <button
              type="button"
              className="topbar-theme-toggle"
              onClick={
                toggleTheme
              }
              title={
                theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              aria-label={
                theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
            >

              <span className="topbar-theme-icon">

                {theme === "dark"
                  ? "☀"
                  : "☾"}

              </span>

            </button>


            {/* =================================================
                PROFILE DROPDOWN
            ================================================== */}

            <div
              className="topbar-profile-wrapper"
              ref={
                profileMenuRef
              }
            >


              {/* PROFILE BUTTON */}

              <button
                type="button"
                className="topbar-profile-button"
                onClick={() =>
                  setProfileMenuOpen(
                    (previous) =>
                      !previous
                  )
                }
                title="Account menu"
                aria-expanded={
                  profileMenuOpen
                }
                aria-haspopup="menu"
              >


                <div className="user-avatar">

                  {user?.photo ? (

                    <img
                      src={user.photo}
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

                    {user?.fullname ||
                      "Administrator"}

                  </strong>

                  <span>

                    {user?.role ||
                      "viewer"}

                  </span>

                </div>


                <span
                  className={`profile-dropdown-arrow ${
                    profileMenuOpen
                      ? "profile-dropdown-arrow-open"
                      : ""
                  }`}
                >

                  ▾

                </span>

              </button>


              {/* =================================================
                  PROFILE DROPDOWN
              ================================================== */}

              {profileMenuOpen && (

                <div
                  className="profile-dropdown-menu"
                  role="menu"
                >


                  {/* USER SUMMARY */}

                  <div className="profile-dropdown-header">

                    <div className="profile-dropdown-avatar">

                      {user?.photo ? (

                        <img
                          src={user.photo}
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


                    <div className="profile-dropdown-user-info">

                      <strong>

                        {user?.fullname ||
                          "Administrator"}

                      </strong>

                      <span>

                        {user?.role ||
                          "viewer"}

                      </span>

                    </div>

                  </div>


                  <div className="profile-dropdown-divider" />


                  {/* MY PROFILE */}

                  <button
                    type="button"
                    className="profile-dropdown-item"
                    onClick={
                      handleProfileClick
                    }
                    role="menuitem"
                  >

                    <span className="profile-dropdown-icon">

                      ♙

                    </span>

                    <span>

                      My Profile

                    </span>

                  </button>


                  {/* THEME */}

                  <button
                    type="button"
                    className="profile-dropdown-item theme-dropdown-item"
                    onClick={
                      toggleTheme
                    }
                    role="menuitem"
                  >

                    <span className="profile-dropdown-icon">

                      {theme === "dark"
                        ? "☀"
                        : "☾"}

                    </span>


                    <span>

                      {theme === "dark"
                        ? "Light Mode"
                        : "Dark Mode"}

                    </span>


                    <span className="theme-status">

                      ON

                    </span>

                  </button>


                  {/* SYSTEM SETTINGS */}

                  {isSuperAdmin && (

                    <button
                      type="button"
                      className="profile-dropdown-item"
                      onClick={
                        handleSystemSettingsClick
                      }
                      role="menuitem"
                    >

                      <span className="profile-dropdown-icon">

                        ⚙

                      </span>

                      <span>

                        System Settings

                      </span>


                      <small className="profile-admin-label">

                        ADMIN

                      </small>

                    </button>

                  )}


                  <div className="profile-dropdown-divider" />


                  {/* SIGN OUT */}

                  <button
                    type="button"
                    className="profile-dropdown-item profile-logout-item"
                    onClick={
                      handleLogout
                    }
                    role="menuitem"
                  >

                    <span className="profile-dropdown-icon">

                      ↪

                    </span>

                    <span>

                      Sign out

                    </span>

                  </button>

                </div>

              )}

            </div>

          </div>

        </header>


        {/* =====================================================
            PAGE CONTENT
        ====================================================== */}

        <main className="content-area">

          <Outlet />

        </main>

      </div>

    </div>

  );

};


export default ProtectedLayout;