import api from "./axios";

/**
 * Genera la URL absoluta a un endpoint de documento, con el token JWT
 * embebido como query param porque <a href> y window.open() no pasan
 * por nuestros interceptors de axios.
 *
 * El backend acepta el token vía Authorization header (estándar) — para
 * descargas en pestaña nueva tenemos que conseguir el header de otra
 * forma; la opción más limpia es descargar como blob desde axios y
 * abrir la URL del blob, así NO se filtra el token en URL/historial.
 *
 * Ese es justo el flujo que implementa abrirDocumento() abajo.
 */

/**
 * Pide el PDF al backend, lo recibe como blob, y abre el blob en una
 * pestaña nueva (o lo descarga si openInNewTab=false).
 *
 * @param {string} url   ruta relativa al api (ej: "/documentos/recibo-pago/42")
 * @param {object} opts  { lang?: 'es'|'en', filename?: string, openInNewTab?: bool }
 */
const obtenerBlobDocumento = async (url, { lang, formato } = {}) => {
  const params = {};
  if (lang) params.lang = lang;
  if (formato) params.formato = formato;
  const res = await api.get(url, { params, responseType: "blob" });
  return new Blob([res.data], { type: "application/pdf" });
};

export const abrirDocumento = async (
  url,
  { lang, formato, filename, mode = "open", openInNewTab = true } = {}
) => {
  const blob = await obtenerBlobDocumento(url, { lang, formato });
  const blobUrl = URL.createObjectURL(blob);

  if (mode === "print") {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = blobUrl;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(blobUrl);
      }, 60_000);
    };

    return;
  }

  if (mode === "download" || openInNewTab === false) {
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || "documento.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else if (openInNewTab) {
    window.open(blobUrl, "_blank", "noopener,noreferrer");
  }

  // Liberar el objeto URL después de un rato (la pestaña ya tiene su copia).
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
};

/**
 * Recibo de pago suelto.
 */
export const abrirReciboPagoRequest = (idPago, opts) =>
  abrirDocumento(`/documentos/recibo-pago/${idPago}`, {
    filename: `recibo-pago-${idPago}.pdf`,
    ...opts,
  });

/**
 * Ticket corto de servicio realizado (entregable al cliente al cerrar visita).
 */
export const abrirTicketServicioRequest = (idOrden, opts) =>
  abrirDocumento(`/documentos/ticket-servicio/${idOrden}`, {
    filename: `ticket-servicio-${idOrden}.pdf`,
    ...opts,
  });

/**
 * Informe completo de orden (incluye evidencias).
 */
export const abrirInformeOrdenRequest = (idOrden, opts) =>
  abrirDocumento(`/documentos/informe-orden/${idOrden}`, {
    filename: `informe-orden-${idOrden}.pdf`,
    ...opts,
  });

/**
 * Estado de cuenta del cliente con rango opcional.
 *  opts: { lang, desde: 'YYYY-MM-DD', hasta: 'YYYY-MM-DD' }
 */
export const abrirEstadoCuentaRequest = async (idCliente, opts = {}) => {
  const { lang, desde, hasta, mode = "open", openInNewTab = true } = opts;
  const params = {};
  if (lang) params.lang = lang;
  if (desde) params.desde = desde;
  if (hasta) params.hasta = hasta;
  const res = await api.get(`/documentos/estado-cuenta/${idCliente}`, {
    params,
    responseType: "blob",
  });
  const blobUrl = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));

  if (mode === "print") {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = blobUrl;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(blobUrl);
      }, 60_000);
    };
  } else if (mode === "download" || openInNewTab === false) {
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `estado-cuenta-${idCliente}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  } else {
    window.open(blobUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  }
};

/**
 * Recibo del abono aplicado a un crédito (id de pagos_credito, no de pago).
 */
export const abrirReciboAbonoRequest = (idPagoCredito, opts) =>
  abrirDocumento(`/documentos/recibo-abono/${idPagoCredito}`, {
    filename: `recibo-abono-${idPagoCredito}.pdf`,
    ...opts,
  });

/**
 * Cotizacion / estimado.
 */
export const abrirCotizacionRequest = (idCotizacion, opts) =>
  abrirDocumento(`/documentos/cotizacion/${idCotizacion}`, {
    filename: `cotizacion-${idCotizacion}.pdf`,
    ...opts,
  });

export const abrirCotizacionTicketRequest = (idCotizacion, opts) =>
  abrirDocumento(`/documentos/cotizacion/${idCotizacion}`, {
    filename: `cotizacion-ticket-${idCotizacion}.pdf`,
    formato: "ticket",
    ...opts,
  });
