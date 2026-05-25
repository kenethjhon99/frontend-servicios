import api from "./axios";
import { extractListPayload } from "../lib/api";

/* =========================
   CATEGORÍAS
========================= */

export const getCategoriasRequest = async (params = {}) => {
  const res = await api.get("/categorias-servicio", { params });
  return extractListPayload(res);
};

export const getCategoriaByIdRequest = async (id) => {
  const res = await api.get(`/categorias-servicio/${id}`);
  return res.data;
};

export const createCategoriaRequest = async (data) => {
  const res = await api.post("/categorias-servicio", data);
  return res.data;
};

export const updateCategoriaRequest = async (id, data) => {
  const res = await api.put(`/categorias-servicio/${id}`, data);
  return res.data;
};

export const changeEstadoCategoriaRequest = async (id, data) => {
  const res = await api.patch(`/categorias-servicio/${id}/estado`, data);
  return res.data;
};

/* =========================
   SERVICIOS
========================= */

export const getServiciosRequest = async (params = {}) => {
  const res = await api.get("/servicios", { params });
  return extractListPayload(res);
};

export const getServicioByIdRequest = async (id) => {
  const res = await api.get(`/servicios/${id}`);
  return res.data;
};

export const createServicioRequest = async (data) => {
  const res = await api.post("/servicios", data);
  return res.data;
};

export const updateServicioRequest = async (id, data) => {
  const res = await api.put(`/servicios/${id}`, data);
  return res.data;
};

export const changeEstadoServicioRequest = async (id, data) => {
  const res = await api.patch(`/servicios/${id}/estado`, data);
  return res.data;
};
