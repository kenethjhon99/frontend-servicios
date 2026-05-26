import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? "http://localhost:3000/api" : "/api"),
  withCredentials: true,
});

const unsafeMethods = ["post", "put", "patch", "delete"];

const readCookie = (name) => {
  if (typeof document === "undefined") return "";

  return (
    document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))
      ?.split("=")
      .slice(1)
      .join("=") || ""
  );
};

api.interceptors.request.use((config) => {
  const locale = localStorage.getItem("codanova-language") || "en";

  if (unsafeMethods.includes(String(config.method).toLowerCase())) {
    const csrfToken = readCookie("sm_csrf");
    if (csrfToken) {
      config.headers["X-CSRF-Token"] = decodeURIComponent(csrfToken);
    }
  }

  config.headers["X-App-Locale"] = locale;

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    const originalRequest = error?.config;
    const isLoginCall = url.includes("/auth/login");
    const isRefreshCall = url.includes("/auth/refresh");
    const isLogoutCall = url.includes("/auth/logout");

    if (status === 401 && !isLoginCall && !isRefreshCall && !isLogoutCall && !originalRequest?._retry) {
      originalRequest._retry = true;

      try {
        await api.post("/auth/refresh");
        return api(originalRequest);
      } catch (_refreshError) {
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }

    if (status === 401 && isRefreshCall && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;
