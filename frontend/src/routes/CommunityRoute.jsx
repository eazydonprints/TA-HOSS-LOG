import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";


const CommunityRoute = () => {

  const {
    user,
    token,
    loading,
  } = useAuth();


  const location =
    useLocation();


  /* =======================================================
     WAIT FOR AUTH INITIALIZATION
  ======================================================= */

  if (loading) {

    return (

      <div className="auth-loading">

        Loading...

      </div>

    );

  }


  /* =======================================================
     NOT LOGGED IN
  ======================================================= */

  if (
    !token ||
    !user
  ) {

    return (

      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname,
        }}
      />

    );

  }


  /* =======================================================
     NORMALIZE ACCOUNT TYPE
  ======================================================= */

  const accountType =
    String(
      user?.accountType ||
      ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /[\s-]+/g,
        "_"
      );


  /* =======================================================
     NORMALIZE ROLE
  ======================================================= */

  const role =
    String(
      user?.role ||
      ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /[\s-]+/g,
        "_"
      );


  /* =======================================================
     SUPER ADMIN

     Super Admin belongs to the Community system.
  ======================================================= */

  if (
    role ===
    "super_admin"
  ) {

    return <Outlet />;

  }


  /* =======================================================
     COMMUNITY USER
  ======================================================= */

  if (
    accountType ===
    "community"
  ) {

    return <Outlet />;

  }


  /* =======================================================
     PUBLIC USER
  ======================================================= */

  if (
    accountType ===
    "public"
  ) {

    return (

      <Navigate
        to="/public"
        replace
      />

    );

  }


  /* =======================================================
     UNKNOWN ACCOUNT
  ======================================================= */

  return (

    <Navigate
      to="/login"
      replace
    />

  );

};


export default CommunityRoute;