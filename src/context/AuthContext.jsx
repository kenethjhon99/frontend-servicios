import { useEffect, useMemo, useState } from "react";
import { loginRequest, perfilRequest } from "../api/auth.api";
import { AuthContext } from "./auth.context";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (credentials) => {
    const data = await loginRequest(credentials);
    localStorage.setItem("token", data.token);
    setUser(data.usuario);
    return data.usuario;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          setLoading(false);
          return;
        }

        const data = await perfilRequest();
        setUser(data.usuario);
      } catch (_err) {
        localStorage.removeItem("token");
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
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
