import api from "./axios";

export const getEvidenciasByOrdenRequest = async (id_orden_trabajo, params = {}) => {
  const res = await api.get(`/evidencias/orden/${id_orden_trabajo}`, { params });
  return res.data;
};

export const getEvidenciaByIdRequest = async (id) => {
  const res = await api.get(`/evidencias/${id}`);
  return res.data;
};

export const createEvidenciaRequest = async (data) => {
  const res = await api.post("/evidencias", data);
  return res.data;
};

export const createMultiplesEvidenciasRequest = async (data) => {
  const res = await api.post("/evidencias/lote", data);
  return res.data;
};

export const updateEvidenciaRequest = async (id, data) => {
  const res = await api.put(`/evidencias/${id}`, data);
  return res.data;
};

export const deleteEvidenciaRequest = async (id) => {
  const res = await api.delete(`/evidencias/${id}`);
  return res.data;
};