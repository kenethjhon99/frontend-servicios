import api from "./axios";
import { extractListPayload } from "../lib/api";

export const getPropiedadesRequest = async (params = {}) => {
  const res = await api.get("/propiedades", { params });
  return extractListPayload(res);
};

export const getPropiedadByIdRequest = async (id) => {
  const res = await api.get(`/propiedades/${id}`);
  return res.data;
};

// Re-exportamos las funciones de mutación que ya viven en clientes.api
// para que las pantallas de propiedades importen todo de un solo módulo.
export {
  getPropiedadesByClienteRequest,
  createPropiedadRequest,
  updatePropiedadRequest,
  changeEstadoPropiedadRequest,
} from "./clientes.api";
