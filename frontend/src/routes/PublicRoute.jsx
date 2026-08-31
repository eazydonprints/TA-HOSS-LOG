import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";


const PublicRoute = () => {

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
     PUBLIC USER
  ======================================================= */

  if (
    accountType ===
    "public"
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

    return (

      <Navigate
        to="/community"
        replace
      />

    );

  }


  /* =======================================================
     SUPER ADMIN
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


  if (
    role ===
    "super_admin"
  ) {

    return (

      <Navigate
        to="/community"
        replace
      />

    );

  }


  return (

    <Navigate
      to="/login"
      replace
    />

  );

};


export default PublicRoute;