import api from "./axios";
import { extractListPayload } from "../lib/api";

/* =========================
   PAGOS
========================= */

export const getPagosRequest = async (params = {}) => {
  const res = await api.get("/pagos", { params });
  return extractListPayload(res);
};

export const getPagoByIdRequest = async (id) => {
  const res = await api.get(`/pagos/${id}`);
  return res.data;
};

export const createPagoRequest = async (data) => {
  const res = await api.post("/pagos", data);
  return res.data;
};

/* =========================
   CRÉDITOS
========================= */

export const createCreditoRequest = async (data) => {
  const res = await api.post("/pagos/creditos", data);
  return res.data;
};

export const getCreditosRequest = async (params = {}) => {
  const res = await api.get("/pagos/creditos/lista", { params });
  return extractListPayload(res);
};

export const getCreditoByIdRequest = async (id) => {
  const res = await api.get(`/pagos/creditos/${id}`);
  return res.data;
};

export const getResumenCobranzaRequest = async (params = {}) => {
  const res = await api.get("/pagos/cobranza/resumen", { params });
  return res.data;
};

export const getSeguimientosCobranzaClienteRequest = async (idCliente) => {
  const res = await api.get(`/pagos/cobranza/seguimientos/cliente/${idCliente}`);
  return res.data;
};

export const createSeguimientoCobranzaRequest = async (data) => {
  const res = await api.post("/pagos/cobranza/seguimientos", data);
  return res.data;
};

export const changeEstadoCreditoRequest = async (id, data) => {
  const res = await api.patch(`/pagos/creditos/${id}/estado`, data);
  return res.data;
};

export const aplicarPagoCreditoRequest = async (data) => {
  const res = await api.post("/pagos/creditos/aplicar-pago", data);
  return res.data;
}; 
