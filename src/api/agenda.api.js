import api from "./axios";

export const getAgendaDiaRequest = async (fecha) => {
  const res = await api.get("/agenda/dia", {
    params: { fecha },
  });

  return res.data;
};

export const getAgendaRangoRequest = async ({ fecha_desde, fecha_hasta }) => {
  const res = await api.get("/agenda/rango", {
    params: { fecha_desde, fecha_hasta },
  });

  return res.data;
};

export const getCalendarioMensualRequest = async ({ anio, mes }) => {
  const res = await api.get("/agenda/mensual", {
    params: { anio, mes },
  });

  return res.data;
};

export const getVencimientosCreditoRequest = async ({
  fecha_desde,
  fecha_hasta,
  estado,
}) => {
  const res = await api.get("/agenda/creditos/vencimientos", {
    params: {
      fecha_desde,
      fecha_hasta,
      estado,
    },
  });

  return res.data;
};