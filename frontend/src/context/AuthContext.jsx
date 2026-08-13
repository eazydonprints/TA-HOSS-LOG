import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const AuthContext = createContext(null);

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

const TOKEN_KEY = "ta_hoss_token";
const USER_KEY = "ta_hoss_user";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const getStoredUser = () => {
  try {
    const savedUser = localStorage.getItem(USER_KEY);

    if (!savedUser) {
      return null;
    }

    return JSON.parse(savedUser);
  } catch (error) {
    console.error("AUTH STORAGE PARSE ERROR:", error);
    localStorage.removeItem(USER_KEY);
    return null;
  }
};

const getStoredToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

const saveUser = (userData) => {
  if (!userData) {
    localStorage.removeItem(USER_KEY);
    return;
  }

  localStorage.setItem(USER_KEY, JSON.stringify(userData));
};

const clearAuthStorage = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

/*
|--------------------------------------------------------------------------
| Auth Provider
|--------------------------------------------------------------------------
*/

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser);
  const [token, setToken] = useState(getStoredToken);
  const [loading, setLoading] = useState(true);

  /*
  |--------------------------------------------------------------------------
  | Authentication Headers
  |--------------------------------------------------------------------------
  */

  const authHeaders = useCallback(
    (extraHeaders = {}) => {
      const currentToken = token || localStorage.getItem(TOKEN_KEY);

      return {
        ...extraHeaders,
        ...(currentToken
          ? {
              Authorization: `Bearer ${currentToken}`,
            }
          : {}),
      };
    },
    [token]
  );

  /*
  |--------------------------------------------------------------------------
  | Logout
  |--------------------------------------------------------------------------
  */

  const logout = useCallback(() => {
    clearAuthStorage();
    setToken(null);
    setUser(null);
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Fetch Current User Profile
  |--------------------------------------------------------------------------
  */

  const refreshProfile = useCallback(async (overrideToken) => {
    const currentToken = overrideToken || token || localStorage.getItem(TOKEN_KEY);

    if (!currentToken) {
      setLoading(false);
      return null;
    }

    try {
      const response = await fetch(`${API_URL}/users/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          logout();
        }

        throw new Error(
          result.message || "Unable to load your profile."
        );
      }

      const profile = result.data;

      setUser(profile);
      saveUser(profile);

      return profile;
    } catch (error) {
      console.error("REFRESH PROFILE ERROR:", error);
      throw error;
    }
  }, [token, logout]);

  /*
  |--------------------------------------------------------------------------
  | Login
  |--------------------------------------------------------------------------
  */

  const login = useCallback(async (newToken, userData) => {
    if (!newToken) {
      throw new Error("Authentication token is required.");
    }

    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);

    // Save initial user payload if provided
    if (userData) {
      saveUser(userData);
      setUser(userData);
    }

    // Automatically fetch full fresh profile from database to ensure updated photo/details persist
    try {
      await refreshProfile(newToken);
    } catch (err) {
      console.warn("Could not immediately fetch latest profile after login:", err);
    }
  }, [refreshProfile]);

  /*
  |--------------------------------------------------------------------------
  | Update Local User
  |--------------------------------------------------------------------------
  */

  const updateLocalUser = useCallback((updatedUser) => {
    if (!updatedUser) {
      return;
    }

    setUser((currentUser) => {
      const mergedUser = {
        ...(currentUser || {}),
        ...updatedUser,
      };

      saveUser(mergedUser);

      return mergedUser;
    });
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Update Current User Profile
  |--------------------------------------------------------------------------
  */

  const updateProfile = useCallback(
    async (profileData) => {
      try {
        const response = await fetch(`${API_URL}/users/me`, {
          method: "PATCH",
          headers: authHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(profileData),
        });

        const result = await response.json();

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            logout();
          }

          throw new Error(
            result.message || "Unable to update profile."
          );
        }

        const updatedUser = result.data;

        setUser(updatedUser);
        saveUser(updatedUser);

        return {
          success: true,
          message:
            result.message || "Profile updated successfully.",
          data: updatedUser,
        };
      } catch (error) {
        console.error("UPDATE PROFILE ERROR:", error);
        throw error;
      }
    },
    [authHeaders, logout]
  );

  /*
  |--------------------------------------------------------------------------
  | Remove Current User Photo
  |--------------------------------------------------------------------------
  */

  const removeProfilePhoto = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/users/me/photo`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          logout();
        }

        throw new Error(
          result.message || "Unable to remove profile photo."
        );
      }

      const updatedUser = result.data;

      setUser(updatedUser);
      saveUser(updatedUser);

      return {
        success: true,
        message:
          result.message || "Profile photo removed successfully.",
        data: updatedUser,
      };
    } catch (error) {
      console.error("REMOVE PROFILE PHOTO ERROR:", error);
      throw error;
    }
  }, [authHeaders, logout]);

  /*
  |--------------------------------------------------------------------------
  | Change Current User Password
  |--------------------------------------------------------------------------
  */

  const changePassword = useCallback(
    async ({ currentPassword, newPassword, confirmPassword }) => {
      try {
        const response = await fetch(`${API_URL}/users/me/password`, {
          method: "PATCH",
          headers: authHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            logout();
          }

          throw new Error(
            result.message || "Unable to change password."
          );
        }

        return {
          success: true,
          message:
            result.message || "Password changed successfully.",
        };
      } catch (error) {
        console.error("CHANGE PASSWORD ERROR:", error);
        throw error;
      }
    },
    [authHeaders, logout]
  );

  /*
  |--------------------------------------------------------------------------
  | Initial Authentication Check
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = getStoredUser();

      if (!storedToken) {
        if (mounted) {
          setToken(null);
          setUser(null);
          setLoading(false);
        }
        return;
      }

      if (mounted) {
        setToken(storedToken);

        if (storedUser) {
          setUser(storedUser);
        }
      }

      try {
        const response = await fetch(`${API_URL}/users/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message ||
              "Authentication session is no longer valid."
          );
        }

        if (mounted) {
          setUser(result.data);
          saveUser(result.data);
        }
      } catch (error) {
        console.error("AUTH INITIALIZATION ERROR:", error);

        clearAuthStorage();

        if (mounted) {
          setToken(null);
          setUser(null);
        }
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

  /*
  |--------------------------------------------------------------------------
  | Context Value
  |--------------------------------------------------------------------------
  */

  const contextValue = useMemo(
    () => ({
      user,
      token,
      login,
      logout,
      isAuthenticated: !!user && !!token,
      loading,
      authHeaders,
      refreshProfile,
      updateProfile,
      updateLocalUser,
      removeProfilePhoto,
      changePassword,
    }),
    [
      user,
      token,
      loading,
      login,
      logout,
      authHeaders,
      refreshProfile,
      updateProfile,
      updateLocalUser,
      removeProfilePhoto,
      changePassword,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }

  return context;
};