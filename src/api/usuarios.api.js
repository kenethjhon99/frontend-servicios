import api from "./axios";
import { extractListPayload } from "../lib/api";

export const getUsuariosRequest = async (params = {}) => {
  const res = await api.get("/usuarios", { params });
  return extractListPayload(res);
};

export const getUsuarioByIdRequest = async (id) => {
  const res = await api.get(`/usuarios/${id}`);
  return res.data;
};

export const createUsuarioRequest = async (data) => {
  const res = await api.post("/usuarios", data);
  return res.data;
};

export const updateUsuarioRequest = async (id, data) => {
  const res = await api.put(`/usuarios/${id}`, data);
  return res.data;
};

export const changeEstadoUsuarioRequest = async (id, data) => {
  const res = await api.patch(`/usuarios/${id}/estado`, data);
  return res.data;
};

export const resetPasswordUsuarioRequest = async (id, data) => {
  const res = await api.patch(`/usuarios/${id}/reset-password`, data);
  return res.data;
};

export const changeMyPasswordRequest = async (data) => {
  const res = await api.patch("/usuarios/mi/password", data);
  return res.data;
};
