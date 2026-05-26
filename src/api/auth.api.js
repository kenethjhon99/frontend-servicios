import api from "./axios";

export const loginRequest = async (data) => {
  const res = await api.post("/auth/login", data);
  return res.data;
};

export const perfilRequest = async () => {
  const res = await api.get("/auth/perfil");
  return res.data;
};

export const refreshRequest = async () => {
  const res = await api.post("/auth/refresh");
  return res.data;
};

export const logoutRequest = async () => {
  const res = await api.post("/auth/logout");
  return res.data;
};
