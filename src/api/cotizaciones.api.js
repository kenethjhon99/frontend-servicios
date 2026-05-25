import api from "./axios";
import { extractListPayload } from "../lib/api";

export const getCotizacionesRequest = async (params = {}) => {
  const res = await api.get("/cotizaciones", { params });
  return extractListPayload(res);
};

export const getCotizacionByIdRequest = async (id) => {
  const res = await api.get(`/cotizaciones/${id}`);
  return res.data;
};

export const createCotizacionRequest = async (data) => {
  const res = await api.post("/cotizaciones", data);
  return res.data;
};

export const updateCotizacionRequest = async (id, data) => {
  const res = await api.put(`/cotizaciones/${id}`, data);
  return res.data;
};

export const changeEstadoCotizacionRequest = async (id, data) => {
  const res = await api.patch(`/cotizaciones/${id}/estado`, data);
  return res.data;
};

export const convertirCotizacionRequest = async (id, data) => {
  const res = await api.post(`/cotizaciones/${id}/convertir`, data);
  return res.data;
};
