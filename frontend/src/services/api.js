import axios from "axios";


/* =========================================================
   TA-HOSS LOG API CONFIGURATION
========================================================= */

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api/v1";


/* =========================================================
   AXIOS INSTANCE
========================================================= */

const api = axios.create({
  baseURL: API_URL.replace(/\/+$/, ""),

  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },

  timeout: 30000,
});


/* =========================================================
   REQUEST INTERCEPTOR
========================================================= */

api.interceptors.request.use(
  (config) => {

    const token =
      localStorage.getItem(
        "ta_hoss_token"
      );

    if (token) {

      config.headers =
        config.headers || {};

      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },

  (error) =>
    Promise.reject(error)
);


/* =========================================================
   RESPONSE INTERCEPTOR
========================================================= */

api.interceptors.response.use(
  (response) => response,

  (error) =>
    Promise.reject(error)
);


/* =========================================================
   HELPERS
========================================================= */

export const getApiUrl = () => {
  return API_URL.replace(/\/+$/, "");
};


export const getAuthToken = () => {
  return localStorage.getItem(
    "ta_hoss_token"
  );
};


export const isSecureWebAuthnContext = () => {

  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.isSecureContext === true ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
};


export default api;