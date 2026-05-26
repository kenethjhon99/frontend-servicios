import { useCallback, useEffect, useMemo, useState } from "react";
import { loginRequest, logoutRequest, perfilRequest } from "../api/auth.api";
import { AuthContext } from "./auth.context";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = useCallback(async (credentials) => {
    const data = await loginRequest(credentials);
    setUser(data.usuario);
    return data.usuario;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
      localStorage.removeItem("token");
    }
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        localStorage.removeItem("token");
        const data = await perfilRequest();
        setUser(data.usuario);
      } catch (_err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      isAuthenticated: !!user,
    }),
    [user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
