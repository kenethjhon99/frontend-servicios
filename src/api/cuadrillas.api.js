import api from "./axios";
import { extractListPayload } from "../lib/api";

export const getCuadrillasRequest = async (params = {}) => {
  const res = await api.get("/cuadrillas", { params });
  return extractListPayload(res);
};

export const getCuadrillaByIdRequest = async (id) => {
  const res = await api.get(`/cuadrillas/${id}`);
  return res.data;
};

export const createCuadrillaRequest = async (data) => {
  const res = await api.post("/cuadrillas", data);
  return res.data;
};

export const updateCuadrillaRequest = async (id, data) => {
  const res = await api.put(`/cuadrillas/${id}`, data);
  return res.data;
};

export const changeEstadoCuadrillaRequest = async (id, data) => {
  const res = await api.patch(`/cuadrillas/${id}/estado`, data);
  return res.data;
};
