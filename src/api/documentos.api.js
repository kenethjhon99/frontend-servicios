import api from "./axios";

/**
 * Descarga documentos mediante axios para conservar cookies de sesion
 * httpOnly y evitar filtrar credenciales en URLs o historial del navegador.
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

  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
};

export const abrirReciboPagoRequest = (idPago, opts) =>
  abrirDocumento(`/documentos/recibo-pago/${idPago}`, {
    filename: `recibo-pago-${idPago}.pdf`,
    ...opts,
  });

export const abrirTicketServicioRequest = (idOrden, opts) =>
  abrirDocumento(`/documentos/ticket-servicio/${idOrden}`, {
    filename: `ticket-servicio-${idOrden}.pdf`,
    ...opts,
  });

export const abrirInformeOrdenRequest = (idOrden, opts) =>
  abrirDocumento(`/documentos/informe-orden/${idOrden}`, {
    filename: `informe-orden-${idOrden}.pdf`,
    ...opts,
  });

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

export const abrirReciboAbonoRequest = (idPagoCredito, opts) =>
  abrirDocumento(`/documentos/recibo-abono/${idPagoCredito}`, {
    filename: `recibo-abono-${idPagoCredito}.pdf`,
    ...opts,
  });

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
