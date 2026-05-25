import api from "./axios";
import { extractListPayload } from "../lib/api";

export const getClientesRequest = async (params = {}) => {
  const res = await api.get("/clientes", { params });
  return extractListPayload(res);
};

export const getClienteByIdRequest = async (id) => {
  const res = await api.get(`/clientes/${id}`);
  return res.data;
};

export const createClienteRequest = async (data) => {
  const res = await api.post("/clientes", data);
  return res.data;
};

export const updateClienteRequest = async (id, data) => {
  const res = await api.put(`/clientes/${id}`, data);
  return res.data;
};

export const changeEstadoClienteRequest = async (id, data) => {
  const res = await api.patch(`/clientes/${id}/estado`, data);
  return res.data;
};

export const getClienteResumenRequest = async (id) => {
  const res = await api.get(`/resumenes/cliente/${id}`);
  return res.data;
};

export const getPropiedadesByClienteRequest = async (id) => {
  const res = await api.get(`/propiedades/cliente/${id}`);
  return res.data;
};

export const createPropiedadRequest = async (data) => {
  const res = await api.post("/propiedades", data);
  return res.data;
};

export const updatePropiedadRequest = async (id, data) => {
  const res = await api.put(`/propiedades/${id}`, data);
  return res.data;
};

export const changeEstadoPropiedadRequest = async (id, data) => {
  const res = await api.patch(`/propiedades/${id}/estado`, data);
  return res.data;
};
