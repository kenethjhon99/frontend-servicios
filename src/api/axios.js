import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? "http://localhost:3000/api" : "/api"),
});

// Request: adjunta el token si existe
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const locale = localStorage.getItem("codanova-language") || "en";

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  config.headers["X-App-Locale"] = locale;

  return config;
});

// Response: si el backend responde 401 (token inválido o expirado),
// limpia el token y redirige a /login. Evita el bucle de errores
// silenciosos cuando el JWT vence (8h por default).
//
// Excepciones:
//  - El propio /auth/login responde 401 con credenciales inválidas;
//    en ese caso NO redirigimos (LoginPage muestra el error inline).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    const isLoginCall = url.includes("/auth/login");

    if (status === 401 && !isLoginCall) {
      const hadToken = !!localStorage.getItem("token");
      localStorage.removeItem("token");

      // Sólo redirigir si había sesión activa y no estamos ya en /login,
      // para no entrar en loops cuando el primer perfilRequest falla.
      if (hadToken && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
