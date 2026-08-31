import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  startAuthentication,
  startRegistration,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";


/* =========================================================
   CONFIGURATION
========================================================= */

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://10.253.205.21:5000/api/v1";

const TOKEN_KEY = "ta_hoss_token";
const USER_KEY = "ta_hoss_user";


/* =========================================================
   CONTEXT
========================================================= */

const AuthContext = createContext(null);


/* =========================================================
   STORAGE HELPERS
========================================================= */

const getStoredToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};


const getStoredUser = () => {
  try {
    const value = localStorage.getItem(USER_KEY);

    if (!value) {
      return null;
    }

    return JSON.parse(value);
  } catch {
    return null;
  }
};


const saveAuth = (token, user) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  if (user) {
    localStorage.setItem(
      USER_KEY,
      JSON.stringify(user)
    );
  }
};


const clearAuthStorage = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};


/* =========================================================
   API HELPERS
========================================================= */

const buildHeaders = (
  token,
  includeJson = true
) => {
  const headers = {};

  if (includeJson) {
    headers["Content-Type"] =
      "application/json";
  }

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  return headers;
};

const parseResponse = async (response) => {
  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      `Request failed with status ${response.status}.`;

    const error = new Error(message);

    error.status = response.status;
    error.code = data?.code;
    error.data = data;

    throw error;
  }

  return data;
};


/* =========================================================
   AUTH PROVIDER
========================================================= */

export const AuthProvider = ({
  children,
}) => {
  const [token, setToken] = useState(
    getStoredToken
  );

  const [user, setUser] = useState(
    getStoredUser
  );

  const [loading, setLoading] =
    useState(true);

  const [biometricLoading, setBiometricLoading] =
    useState(false);

  const [biometricStatus, setBiometricStatus] =
    useState(null);


  /* =======================================================
     AUTH HEADERS HELPER
  ======================================================= */

  const authHeaders = useCallback(
    (includeJson = true) => {
      const currentToken = getStoredToken();
      return buildHeaders(currentToken, includeJson);
    },
    []
  );


  /* =======================================================
     SAVE USER
  ======================================================= */

  const persistUser = useCallback(
    (userData) => {
      setUser(userData);

      if (userData) {
        localStorage.setItem(
          USER_KEY,
          JSON.stringify(userData)
        );
      } else {
        localStorage.removeItem(
          USER_KEY
        );
      }
    },
    []
  );


  /* =======================================================
     LOGOUT
  ======================================================= */

  const logout = useCallback(() => {
    clearAuthStorage();

    setToken(null);
    setUser(null);
    setBiometricStatus(null);
  }, []);


  /* =======================================================
     REFRESH PROFILE
  ======================================================= */

  const refreshProfile =
    useCallback(async () => {
      const currentToken =
        getStoredToken();

      if (!currentToken) {
        return null;
      }

      try {
        const response =
          await fetch(
            `${API_URL}/users/me`,
            {
              method: "GET",
              headers:
                buildHeaders(
                  currentToken,
                  false
                ),
            }
          );

        const data =
          await parseResponse(
            response
          );

        const refreshedUser =
          data?.user ||
          data?.data ||
          data;

        if (refreshedUser) {
          persistUser(
            refreshedUser
          );
        }

        return refreshedUser;
      } catch (error) {
        if (
          error.status === 401 ||
          error.status === 403
        ) {
          logout();
        }

        throw error;
      }
    }, [logout, persistUser]);


  /* =======================================================
     INITIAL AUTH CHECK
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    const initializeAuth =
      async () => {
        const storedToken =
          getStoredToken();

        if (!storedToken) {
          if (mounted) {
            setLoading(false);
          }

          return;
        }

        try {
          const response =
            await fetch(
              `${API_URL}/users/me`,
              {
                method: "GET",
                headers:
                  buildHeaders(
                    storedToken,
                    false
                  ),
              }
            );

          if (!response.ok) {
            if (
              response.status ===
                401 ||
              response.status ===
                403
            ) {
              clearAuthStorage();

              if (mounted) {
                setToken(null);
                setUser(null);
              }
            }

            return;
          }

          const data =
            await response.json();

          const currentUser =
            data?.user ||
            data?.data ||
            data;

          if (
            mounted &&
            currentUser
          ) {
            setUser(
              currentUser
            );

            localStorage.setItem(
              USER_KEY,
              JSON.stringify(
                currentUser
              )
            );
          }
        } catch (error) {
          console.error(
            "Authentication initialization error:",
            error
          );
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);


  /* =======================================================
     NORMAL LOGIN
  ======================================================= */

  const login = useCallback(
    async (
      tokenOrCredentials,
      userData = null
    ) => {
      if (
        typeof tokenOrCredentials ===
          "string" &&
        userData
      ) {
        saveAuth(
          tokenOrCredentials,
          userData
        );

        setToken(
          tokenOrCredentials
        );

        setUser(userData);

        return {
          token:
            tokenOrCredentials,
          user: userData,
        };
      }


      if (
        tokenOrCredentials &&
        typeof tokenOrCredentials ===
          "object"
      ) {
        const {
          identifier,
          password,
        } = tokenOrCredentials;

        const response =
          await fetch(
            `${API_URL}/auth/login`,
            {
              method: "POST",
              headers:
                buildHeaders(
                  null,
                  true
                ),
              body: JSON.stringify({
                identifier,
                password,
              }),
            }
          );

        const data =
          await parseResponse(
            response
          );

        const newToken =
          data?.token ||
          data?.accessToken;

        const newUser =
          data?.user ||
          data?.data?.user;

        if (!newToken) {
          throw new Error(
            "Login succeeded but no authentication token was returned."
          );
        }

        saveAuth(
          newToken,
          newUser
        );

        setToken(newToken);
        setUser(newUser);

        return {
          token: newToken,
          user: newUser,
          data,
        };
      }

      throw new Error(
        "Invalid login arguments."
      );
    },
    []
  );


  /* =======================================================
     PASSWORD LOGIN
  ======================================================= */

  const loginWithPassword =
    useCallback(
      async (
        identifier,
        password
      ) => {
        return login({
          identifier,
          password,
        });
      },
      [login]
    );


  /* =======================================================
     BIOMETRIC SUPPORT
  ======================================================= */

  const biometricSupported =
    useMemo(() => {
      try {
        return browserSupportsWebAuthn();
      } catch {
        return false;
      }
    }, []);


  /* =======================================================
     BIOMETRIC STATUS
  ======================================================= */

  const getBiometricStatus =
    useCallback(async () => {
      const currentToken =
        getStoredToken();

      if (!currentToken) {
        return null;
      }

      const response =
        await fetch(
          `${API_URL}/biometric/status`,
          {
            method: "GET",
            headers:
              buildHeaders(
                currentToken,
                false
              ),
          }
        );

      const data =
        await parseResponse(
          response
        );

      setBiometricStatus(
        data
      );

      return data;
    }, []);


  /* =======================================================
     BIOMETRIC REGISTRATION OPTIONS
  ======================================================= */

  const getBiometricRegistrationOptions =
    useCallback(async () => {
      const currentToken =
        getStoredToken();

      if (!currentToken) {
        throw new Error(
          "Authentication is required."
        );
      }

      const response =
        await fetch(
          `${API_URL}/biometric/registration/options`,
          {
            method: "POST",
            headers:
              buildHeaders(
                currentToken,
                true
              ),
            body: JSON.stringify({}),
          }
        );

      return parseResponse(response);
    }, []);


  /* =======================================================
     ENABLE USER BIOMETRIC
  ======================================================= */

  const registerBiometric =
    useCallback(
      async (
        deviceName = "TA-HOSS LOG Passkey"
      ) => {
        if (!biometricSupported) {
          throw new Error(
            "This device or browser does not support WebAuthn/passkeys."
          );
        }

        setBiometricLoading(true);

        try {
          const optionsResponse =
            await getBiometricRegistrationOptions();

          if (
            !optionsResponse?.options
          ) {
            throw new Error(
              "The server did not return biometric registration options."
            );
          }

          const credential =
            await startRegistration({
              optionsJSON:
                optionsResponse.options,
            });

          const currentToken =
            getStoredToken();

          const response =
            await fetch(
              `${API_URL}/biometric/registration/verify`,
              {
                method: "POST",
                headers:
                  buildHeaders(
                    currentToken,
                    true
                  ),
                body: JSON.stringify({
                  credential,
                  challenge:
                    optionsResponse.options
                      .challenge,
                  deviceName,
                }),
              }
            );

          const data =
            await parseResponse(
              response
            );

          if (data?.biometric) {
            setBiometricStatus({
              success: true,
              biometricEnabled:
                true,
              credentials: 1,
            });
          }

          try {
            await refreshProfile();
          } catch (error) {
            console.warn(
              "Profile refresh after biometric registration failed:",
              error
            );
          }

          return data;
        } finally {
          setBiometricLoading(false);
        }
      },
      [
        biometricSupported,
        getBiometricRegistrationOptions,
        refreshProfile,
      ]
    );


  /* =======================================================
     BIOMETRIC LOGIN OPTIONS
  ======================================================= */

  const getBiometricLoginOptions =
    useCallback(
      async (identifier = "") => {
        const response =
          await fetch(
            `${API_URL}/biometric/login/options`,
            {
              method: "POST",
              headers:
                buildHeaders(
                  null,
                  true
                ),
              body: JSON.stringify({
                identifier:
                  identifier?.trim() ||
                  "",
              }),
            }
          );

        return parseResponse(
          response
        );
      },
      []
    );


  /* =======================================================
     BIOMETRIC LOGIN
  ======================================================= */

  const loginWithBiometric =
    useCallback(
      async (
        identifier = ""
      ) => {
        if (!biometricSupported) {
          throw new Error(
            "This device or browser does not support biometric/passkey authentication."
          );
        }

        setBiometricLoading(true);

        try {
          const optionsResponse =
            await getBiometricLoginOptions(
              identifier
            );

          if (
            !optionsResponse?.options
          ) {
            throw new Error(
              "The server did not return biometric login options."
            );
          }

          const credential =
            await startAuthentication({
              optionsJSON:
                optionsResponse.options,
            });

          const response =
            await fetch(
              `${API_URL}/biometric/login/verify`,
              {
                method: "POST",
                headers:
                  buildHeaders(
                    null,
                    true
                  ),
                body: JSON.stringify({
                  credential,
                  challenge:
                    optionsResponse.options
                      .challenge,
                }),
              }
            );

          const data =
            await parseResponse(
              response
            );

          const newToken =
            data?.token ||
            data?.accessToken;

          const newUser =
            data?.user ||
            data?.data?.user;

          if (!newToken) {
            throw new Error(
              "Biometric login succeeded but no authentication token was returned."
            );
          }

          saveAuth(
            newToken,
            newUser
          );

          setToken(newToken);
          setUser(newUser);

          return {
            token: newToken,
            user: newUser,
            data,
          };
        } finally {
          setBiometricLoading(
            false
          );
        }
      },
      [
        biometricSupported,
        getBiometricLoginOptions,
      ]
    );


  /* =======================================================
     BIOMETRIC CREDENTIALS
  ======================================================= */

  const getBiometricCredentials =
    useCallback(async () => {
      const currentToken =
        getStoredToken();

      if (!currentToken) {
        throw new Error(
          "Authentication is required."
        );
      }

      const response =
        await fetch(
          `${API_URL}/biometric/credentials`,
          {
            method: "GET",
            headers:
              buildHeaders(
                currentToken,
                false
              ),
          }
        );

      return parseResponse(response);
    }, []);


  /* =======================================================
     REMOVE BIOMETRIC CREDENTIAL
  ======================================================= */

  const removeBiometricCredential =
    useCallback(
      async (credentialId) => {
        if (!credentialId) {
          throw new Error(
            "Credential ID is required."
          );
        }

        const currentToken =
          getStoredToken();

        if (!currentToken) {
          throw new Error(
            "Authentication is required."
          );
        }

        const response =
          await fetch(
            `${API_URL}/biometric/credentials/${encodeURIComponent(
              credentialId
            )}`,
            {
              method: "DELETE",
              headers:
                buildHeaders(
                  currentToken,
                  false
                ),
            }
          );

        const data =
          await parseResponse(
            response
          );

        setBiometricStatus(
          (previous) => ({
            ...(previous || {}),
            biometricEnabled:
              Boolean(
                data?.biometricEnabled
              ),
          })
        );

        try {
          await refreshProfile();
        } catch (error) {
          console.warn(
            "Profile refresh after biometric removal failed:",
            error
          );
        }

        return data;
      },
      [refreshProfile]
    );


  /* =======================================================
     UPDATE PROFILE
  ======================================================= */

  const updateProfile =
    useCallback(
      async (profileData) => {
        const currentToken =
          getStoredToken();

        if (!currentToken) {
          throw new Error(
            "Authentication is required."
          );
        }

        const response =
          await fetch(
            `${API_URL}/users/me`,
            {
              method: "PATCH",
              headers:
                buildHeaders(
                  currentToken,
                  true
                ),
              body: JSON.stringify(
                profileData
              ),
            }
          );

        const data =
          await parseResponse(
            response
          );

        const updatedUser =
          data?.user ||
          data?.data?.user ||
          data?.data ||
          null;

        if (updatedUser) {
          persistUser(
            updatedUser
          );
        }

        return data;
      },
      [persistUser]
    );


  /* =======================================================
     REMOVE PROFILE PHOTO
  ======================================================= */

  const removeProfilePhoto =
    useCallback(async () => {
      const currentToken =
        getStoredToken();

      if (!currentToken) {
        throw new Error(
          "Authentication is required."
        );
      }

      const response =
        await fetch(
          `${API_URL}/users/me/photo`,
          {
            method: "DELETE",
            headers:
              buildHeaders(
                currentToken,
                false
              ),
          }
        );

      const data =
        await parseResponse(
          response
        );

      const updatedUser =
        data?.user ||
        data?.data?.user;

      if (updatedUser) {
        persistUser(
          updatedUser
        );
      }

      return data;
    }, [persistUser]);


  /* =======================================================
     CHANGE PASSWORD
  ======================================================= */

  const changePassword =
    useCallback(
      async ({
        currentPassword,
        newPassword,
      }) => {
        const currentToken =
          getStoredToken();

        if (!currentToken) {
          throw new Error(
            "Authentication is required."
          );
        }

        const response =
          await fetch(
            `${API_URL}/auth/change-password`,
            {
              method: "PATCH",
              headers:
                buildHeaders(
                  currentToken,
                  true
                ),
              body: JSON.stringify({
                currentPassword,
                newPassword,
              }),
            }
          );

        return parseResponse(
          response
        );
      },
      []
    );


  /* =======================================================
     AUTH STATE
  ======================================================= */

  const isAuthenticated =
    Boolean(token && user);


  /* =======================================================
     CONTEXT VALUE
  ======================================================= */

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated,

      login,
      loginWithPassword,
      loginWithBiometric,
      logout,

      refreshProfile,

      authHeaders,

      updateProfile,
      removeProfilePhoto,
      changePassword,

      biometricSupported,
      biometricLoading,
      biometricStatus,

      getBiometricStatus,
      registerBiometric,
      getBiometricRegistrationOptions,
      getBiometricLoginOptions,
      getBiometricCredentials,
      removeBiometricCredential,

      API_URL,
    }),
    [
      user,
      token,
      loading,
      isAuthenticated,
      login,
      loginWithPassword,
      loginWithBiometric,
      logout,
      refreshProfile,
      authHeaders,
      updateProfile,
      removeProfilePhoto,
      changePassword,
      biometricSupported,
      biometricLoading,
      biometricStatus,
      getBiometricStatus,
      registerBiometric,
      getBiometricRegistrationOptions,
      getBiometricLoginOptions,
      getBiometricCredentials,
      removeBiometricCredential,
    ]
  );


  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
};


/* =========================================================
   HOOK
========================================================= */

export const useAuth = () => {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside an AuthProvider."
    );
  }

  return context;
};


export default AuthContext;