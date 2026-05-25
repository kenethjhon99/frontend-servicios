import api from "./axios";
import { extractListPayload } from "../lib/api";

export const getOrdenesRequest = async (params = {}) => {
  const res = await api.get("/ordenes", { params });
  return extractListPayload(res);
};

export const getOrdenByIdRequest = async (id) => {
  const res = await api.get(`/ordenes/${id}`);
  return res.data;
};

export const createOrdenRequest = async (data) => {
  const res = await api.post("/ordenes", data);
  return res.data;
};

export const updateOrdenRequest = async (id, data) => {
  const res = await api.put(`/ordenes/${id}`, data);
  return res.data;
};

export const changeEstadoOrdenRequest = async (id, data) => {
  const res = await api.patch(`/ordenes/${id}/estado`, data);
  return res.data;
};
