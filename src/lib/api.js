/**
 * Extrae { data, pagination } de una respuesta de listado.
 *
 * Acepta dos formatos del backend:
 *  - { data: [...], pagination: { page, limit, total, total_pages } }
 *  - [...]  (legacy / endpoints sin paginar — pagination queda en null)
 *
 * Siempre devuelve un objeto con la misma forma para que la UI no tenga
 * que ramificar.
 */
export const extractListPayload = (response) => {
  const body = response?.data;

  if (Array.isArray(body)) {
    return { data: body, pagination: null };
  }

  if (Array.isArray(body?.data)) {
    return {
      data: body.data,
      pagination: body.pagination ?? null,
    };
  }

  return { data: [], pagination: null };
};

export const extractApiError = (error, fallbackMessage) =>
  error?.response?.data?.error || fallbackMessage;
