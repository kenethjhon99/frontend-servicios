import api from "./axios";
import { extractListPayload } from "../lib/api";

export const getEmpleadosRequest = async (params = {}) => {
  const res = await api.get("/empleados", { params });
  return extractListPayload(res);
};

export const getEmpleadoByIdRequest = async (id) => {
  const res = await api.get(`/empleados/${id}`);
  return res.data;
};

export const createEmpleadoRequest = async (data) => {
  const res = await api.post("/empleados", data);
  return res.data;
};

export const updateEmpleadoRequest = async (id, data) => {
  const res = await api.put(`/empleados/${id}`, data);
  return res.data;
};

export const changeEstadoEmpleadoRequest = async (id, data) => {
  const res = await api.patch(`/empleados/${id}/estado`, data);
  return res.data;
};
