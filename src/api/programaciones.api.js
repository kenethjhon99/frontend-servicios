import api from "./axios";
import { extractListPayload } from "../lib/api";

export const getProgramacionesRequest = async (params = {}) => {
  const res = await api.get("/programaciones", { params });
  return extractListPayload(res);
};

export const getProgramacionByIdRequest = async (id) => {
  const res = await api.get(`/programaciones/${id}`);
  return res.data;
};

export const getProgramacionEjecucionesRequest = async (id) => {
  const res = await api.get(`/programaciones/${id}/ejecuciones`);
  return extractListPayload(res).data;
};

export const createProgramacionRequest = async (data) => {
  const res = await api.post("/programaciones", data);
  return res.data;
};

export const updateProgramacionRequest = async (id, data) => {
  const res = await api.put(`/programaciones/${id}`, data);
  return res.data;
};

export const changeEstadoProgramacionRequest = async (id, data) => {
  const res = await api.patch(`/programaciones/${id}/estado`, data);
  return res.data;
};

export const generarEjecucionProgramacionRequest = async (id, data = {}) => {
  const res = await api.post(`/programaciones/${id}/ejecuciones/generar`, data);
  return res.data;
};

export const reprogramarEjecucionProgramacionRequest = async (id, data) => {
  const res = await api.post(`/programaciones/ejecuciones/${id}/reprogramar`, data);
  return res.data;
};

export const cancelarEjecucionProgramacionRequest = async (id, data) => {
  const res = await api.post(`/programaciones/ejecuciones/${id}/cancelar`, data);
  return res.data;
};

export const generarOrdenDesdeEjecucionProgramacionRequest = async (id) => {
  const res = await api.post(`/programaciones/ejecuciones/${id}/generar-orden`);
  return res.data;
};
