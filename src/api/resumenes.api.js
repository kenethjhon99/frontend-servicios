import api from "./axios";

export const getResumenOrdenRequest = async (idOrden) => {
  const res = await api.get(`/resumenes/orden/${idOrden}`);
  return res.data;
};