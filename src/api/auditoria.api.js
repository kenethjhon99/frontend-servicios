import api from "./axios";
import { extractListPayload } from "../lib/api";

export const getAuditoriasRequest = async (params = {}) => {
  const res = await api.get("/auditoria", { params });
  return extractListPayload(res);
};

export const getAuditoriaByIdRequest = async (id) => {
  const res = await api.get(`/auditoria/${id}`);
  return res.data;
};

export const getHistorialRegistroRequest = async ({ tabla, id }) => {
  const res = await api.get(`/auditoria/registro/${tabla}/${id}`);
  return res.data;
};

export const getAuditoriaUsuarioRequest = async (idUsuario, params = {}) => {
  const res = await api.get(`/auditoria/usuario/${idUsuario}`, { params });
  return res.data;
};