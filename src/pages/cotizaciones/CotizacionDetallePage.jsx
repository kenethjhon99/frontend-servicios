import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getEmpleadosRequest } from "../../api/empleados.api";
import {
  changeEstadoCotizacionRequest,
  convertirCotizacionRequest,
  getCotizacionByIdRequest,
  updateCotizacionRequest,
} from "../../api/cotizaciones.api";
import {
  abrirCotizacionRequest,
  abrirCotizacionTicketRequest,
} from "../../api/documentos.api";
import AlertMessage from "../../components/common/AlertMessage";
import ConfirmModal from "../../components/common/ConfirmModal";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";
import PdfButtonGroup from "../../components/common/PdfButtonGroup";
import StatCard from "../../components/common/StatCard";
import TableBase from "../../components/common/TableBase";
import { useI18n } from "../../context/i18n.context";
import { useToast } from "../../context/toast.context";
import { extractApiError } from "../../lib/api";
import { formatCurrency } from "../../utils/currency";
import CotizacionForm from "./components/CotizacionForm";

const badgeClassByEstado = {
  BORRADOR: "bg-slate-200 text-slate-700",
  ENVIADA: "bg-blue-100 text-blue-700",
  APROBADA: "bg-green-100 text-green-700",
  RECHAZADA: "bg-red-100 text-red-700",
  VENCIDA: "bg-yellow-100 text-yellow-700",
  CONVERTIDA: "bg-violet-100 text-violet-700",
};

const initialConversionForm = {
  fecha_servicio: "",
  id_empleados: [],
  observaciones_previas: "",
};

const getEstadoCotizacionLabel = (estado, t) => {
  if (estado === "BORRADOR") return t("quotes.pending");
  if (estado === "ENVIADA") return t("quotes.sent");
  if (estado === "APROBADA") return t("quotes.approved");
  if (estado === "RECHAZADA") return t("quotes.rejected");
  if (estado === "VENCIDA") return t("quotes.expired");
  if (estado === "CONVERTIDA") return t("quotes.converted");
  return estado;
};

const formatEmpleadoOption = (empleado, fecha, t) => {
  if (!fecha) {
    return empleado.nombre_completo;
  }

  if (empleado.disponible_fecha) {
    return `${empleado.nombre_completo} - ${t("schedules.form.available")}`;
  }

  return `${empleado.nombre_completo} - ${t("schedules.form.busy", {
    orders: empleado.ordenes_fecha_count || 0,
    schedules: empleado.programaciones_fecha_count || 0,
  })}`;
};

const CotizacionDetallePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useI18n();
  const [cotizacion, setCotizacion] = useState(null);
  const [clienteNombre, setClienteNombre] = useState("");
  const [propiedadNombre, setPropiedadNombre] = useState("");
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [changingEstado, setChangingEstado] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [conversionForm, setConversionForm] = useState(initialConversionForm);
  const [converting, setConverting] = useState(false);

  const loadCotizacion = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getCotizacionByIdRequest(id);
      setCotizacion(data);
      setClienteNombre(data.cliente || "-");
      setPropiedadNombre(data.nombre_propiedad || "-");
    } catch (err) {
      setError(extractApiError(err, t("quotes.loadError")));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCotizacion();
  }, [id]);

  useEffect(() => {
    const loadEmpleados = async () => {
      try {
        const { data } = await getEmpleadosRequest({
          estado: "ACTIVO",
          limit: 200,
          ...(conversionForm.fecha_servicio ? { fecha: conversionForm.fecha_servicio } : {}),
        });
        setEmpleados(data);
      } catch (err) {
        setError((prev) => prev || extractApiError(err, t("quotes.detailPage.employeeLoadError")));
      }
    };

    loadEmpleados();
  }, [conversionForm.fecha_servicio, t]);

  const handleSave = async (form) => {
    try {
      setSaving(true);
      setError("");
      await updateCotizacionRequest(cotizacion.id_cotizacion, form);
      toast.success(t("quotes.detailPage.updateSuccess"));
      setEditModalOpen(false);
      await loadCotizacion();
    } catch (err) {
      const message = extractApiError(err, t("quotes.detailPage.updateError"));
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCambioEstado = async () => {
    if (!confirmTarget) return;

    try {
      setChangingEstado(true);
      setError("");
      await changeEstadoCotizacionRequest(cotizacion.id_cotizacion, {
        estado: confirmTarget.estado,
      });
      toast.success(
        t("quotes.detailPage.changeSuccess", {
          state: getEstadoCotizacionLabel(confirmTarget.estado, t),
        })
      );
      setConfirmTarget(null);
      await loadCotizacion();
    } catch (err) {
      const message = extractApiError(err, t("quotes.detailPage.changeError"));
      setError(message);
      toast.error(message);
    } finally {
      setChangingEstado(false);
    }
  };

  const handleConvert = async () => {
    if (!conversionForm.fecha_servicio) {
      setError(t("quotes.detailPage.convertRequiredDate"));
      return;
    }

    try {
      setConverting(true);
      setError("");
      const response = await convertirCotizacionRequest(cotizacion.id_cotizacion, {
        fecha_servicio: conversionForm.fecha_servicio,
        id_empleados: conversionForm.id_empleados.map((item) => Number(item)),
        observaciones_previas: conversionForm.observaciones_previas || null,
      });
      toast.success(t("quotes.detailPage.convertSuccess"));
      setConvertModalOpen(false);
      setConversionForm(initialConversionForm);
      navigate(`/ordenes/${response.orden.id_orden_trabajo}`);
    } catch (err) {
      const message = extractApiError(err, t("quotes.detailPage.convertError"));
      setError(message);
      toast.error(message);
    } finally {
      setConverting(false);
    }
  };

  const detallesColumns = useMemo(
    () => [
      {
        key: "servicio",
        label: t("schedules.service"),
        render: (row) => row.servicio || row.descripcion,
      },
      { key: "descripcion", label: t("quotes.form.descriptionPlaceholder").replace(" *", "") },
      { key: "cantidad", label: t("quotes.form.quantityPlaceholder") },
      {
        key: "precio_unitario",
        label: t("quotes.form.unitPricePlaceholder").replace(" *", ""),
        render: (row) => formatCurrency(row.precio_unitario),
      },
      {
        key: "subtotal",
        label: t("quotes.detailPage.subtotal"),
        render: (row) => formatCurrency(row.subtotal),
      },
      {
        key: "descripcion_precio",
        label: t("quotes.form.priceNotePlaceholder"),
        render: (row) => row.descripcion_precio || "-",
      },
    ],
    [t]
  );

  if (loading) return <Loader text={t("quotes.detailPage.loading")} />;

  if (!cotizacion) {
    return (
      <div className="space-y-4">
        <AlertMessage message={error} />
        <EmptyState
          title={t("quotes.detailPage.noInfoTitle")}
          description={t("quotes.detailPage.noInfoDescription")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AlertMessage message={error} />

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{cotizacion.numero_cotizacion}</h1>
            <p className="text-sm text-slate-500">
              {clienteNombre} - {propiedadNombre}
            </p>
          </div>

          <span
            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${
              badgeClassByEstado[cotizacion.estado] || badgeClassByEstado.BORRADOR
            }`}
          >
            {getEstadoCotizacionLabel(cotizacion.estado, t)}
          </span>
        </div>

        <div className="mt-4 border-t pt-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">
                {t("quotes.detailPage.clientPdf")}
              </p>
              <PdfButtonGroup
                label={t("common.pdf")}
                onDownload={(opts) => abrirCotizacionRequest(cotizacion.id_cotizacion, opts)}
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">
                {t("quotes.detailPage.ticketPdf")}
              </p>
              <PdfButtonGroup
                label="Ticket"
                onDownload={(opts) => abrirCotizacionTicketRequest(cotizacion.id_cotizacion, opts)}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {cotizacion.estado === "BORRADOR" && (
            <>
              <button
                type="button"
                onClick={() => setEditModalOpen(true)}
                className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50"
              >
                {t("quotes.detailPage.editAction")}
              </button>
              <button
                type="button"
                onClick={() =>
                  setConfirmTarget({
                    estado: "ENVIADA",
                    label: t("quotes.send"),
                  })
                }
                className="rounded-xl border px-4 py-2 text-sm hover:bg-blue-50"
              >
                {t("quotes.send")}
              </button>
              <button
                type="button"
                onClick={() =>
                  setConfirmTarget({
                    estado: "RECHAZADA",
                    label: t("quotes.reject"),
                  })
                }
                className="rounded-xl border px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                {t("quotes.reject")}
              </button>
            </>
          )}

          {cotizacion.estado === "ENVIADA" && (
            <>
              <button
                type="button"
                onClick={() =>
                  setConfirmTarget({
                    estado: "APROBADA",
                    label: t("quotes.approve"),
                  })
                }
                className="rounded-xl border px-4 py-2 text-sm hover:bg-green-50"
              >
                {t("quotes.approve")}
              </button>
              <button
                type="button"
                onClick={() =>
                  setConfirmTarget({
                    estado: "RECHAZADA",
                    label: t("quotes.reject"),
                  })
                }
                className="rounded-xl border px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                {t("quotes.reject")}
              </button>
              <button
                type="button"
                onClick={() =>
                  setConfirmTarget({
                    estado: "VENCIDA",
                    label: t("quotes.detailPage.markExpired"),
                  })
                }
                className="rounded-xl border px-4 py-2 text-sm hover:bg-yellow-50"
              >
                {t("quotes.detailPage.markExpired")}
              </button>
            </>
          )}

          {cotizacion.estado === "APROBADA" && (
            <>
              <button
                type="button"
                onClick={() => setConvertModalOpen(true)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
              >
                {t("quotes.detailPage.convertToOrder")}
              </button>
              <button
                type="button"
                onClick={() =>
                  setConfirmTarget({
                    estado: "RECHAZADA",
                    label: t("quotes.reject"),
                  })
                }
                className="rounded-xl border px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                {t("quotes.reject")}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title={t("quotes.detailPage.subtotal")} value={formatCurrency(cotizacion.subtotal)} />
        <StatCard title={t("quotes.detailPage.discount")} value={formatCurrency(cotizacion.descuento)} />
        <StatCard title={t("quotes.total")} value={formatCurrency(cotizacion.total)} />
        <StatCard title={t("quotes.validity")} value={cotizacion.vigencia_hasta || "-"} />
      </div>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">{t("quotes.detailPage.generalData")}</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t("quotes.detailPage.client")}</p>
            <p className="font-medium">{clienteNombre}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t("quotes.property")}</p>
            <p className="font-medium">{propiedadNombre}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t("quotes.detailPage.quoteDate")}</p>
            <p className="font-medium">{cotizacion.fecha_cotizacion}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t("quotes.detailPage.validUntil")}</p>
            <p className="font-medium">{cotizacion.vigencia_hasta || "-"}</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("quotes.detailPage.quotedDetails")}</h2>
        {cotizacion.detalles?.length ? (
          <TableBase columns={detallesColumns} data={cotizacion.detalles} />
        ) : (
          <EmptyState
            title={t("quotes.detailPage.noDetailsTitle")}
            description={t("quotes.detailPage.noDetailsDescription")}
          />
        )}
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">{t("quotes.detailPage.observations")}</h2>
        <p className="mt-2 text-sm text-slate-600">
          {cotizacion.observaciones || t("quotes.detailPage.noObservations")}
        </p>
      </section>

      {editModalOpen && (
        <Modal title={t("quotes.detailPage.editTitle")} onClose={() => setEditModalOpen(false)}>
          <CotizacionForm
            initialData={cotizacion}
            loading={saving}
            submitLabel={t("quotes.detailPage.updateLabel")}
            onSubmit={handleSave}
            onCancel={() => setEditModalOpen(false)}
          />
        </Modal>
      )}

      {confirmTarget && (
        <ConfirmModal
          title={t("quotes.detailPage.changeTitle", { action: confirmTarget.label })}
          message={t("quotes.detailPage.changeMessage", {
            number: cotizacion.numero_cotizacion,
            state: getEstadoCotizacionLabel(confirmTarget.estado, t),
          })}
          confirmLabel={confirmTarget.label}
          cancelLabel={t("common.close")}
          loading={changingEstado}
          confirmVariant={confirmTarget.estado === "RECHAZADA" ? "danger" : "primary"}
          onConfirm={handleCambioEstado}
          onClose={() => setConfirmTarget(null)}
        />
      )}

      {convertModalOpen && (
        <Modal
          title={t("quotes.detailPage.convertTitle")}
          onClose={() => setConvertModalOpen(false)}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{t("quotes.detailPage.convertDescription")}</p>

            <input
              type="date"
              aria-label={t("quotes.detailPage.serviceDate")}
              value={conversionForm.fecha_servicio}
              onChange={(e) =>
                setConversionForm((prev) => ({ ...prev, fecha_servicio: e.target.value }))
              }
              className="w-full rounded-xl border px-4 py-3"
            />

            <select
              multiple
              aria-label={t("quotes.detailPage.assignedEmployees")}
              value={conversionForm.id_empleados}
              onChange={(e) =>
                setConversionForm((prev) => ({
                  ...prev,
                  id_empleados: Array.from(e.target.selectedOptions, (option) => option.value),
                }))
              }
              className="w-full rounded-xl border px-4 py-3"
            >
              {empleados.map((empleado) => (
                <option
                  key={empleado.id_empleado}
                  value={empleado.id_empleado}
                  disabled={Boolean(
                    conversionForm.fecha_servicio && empleado.disponible_fecha === false
                  )}
                >
                  {formatEmpleadoOption(empleado, conversionForm.fecha_servicio, t)}
                </option>
              ))}
            </select>

            <p className="text-xs text-slate-500">{t("quotes.detailPage.employeesHelp")}</p>

            <textarea
              value={conversionForm.observaciones_previas}
              onChange={(e) =>
                setConversionForm((prev) => ({
                  ...prev,
                  observaciones_previas: e.target.value,
                }))
              }
              rows={3}
              placeholder={t("quotes.detailPage.priorNotesPlaceholder")}
              className="w-full rounded-xl border px-4 py-3"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConvertModalOpen(false)}
                className="rounded-xl border px-4 py-2"
                disabled={converting}
              >
                {t("quotes.form.cancel")}
              </button>

              <button
                type="button"
                onClick={handleConvert}
                className="rounded-xl bg-slate-900 px-4 py-2 text-white"
                disabled={converting}
              >
                {converting ? t("quotes.detailPage.converting") : t("quotes.detailPage.createOrder")}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CotizacionDetallePage;
