import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { createPropiedadRequest, getClienteResumenRequest } from "../../api/clientes.api";
import { abrirEstadoCuentaRequest } from "../../api/documentos.api";
import AlertMessage from "../../components/common/AlertMessage";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";
import StatCard from "../../components/common/StatCard";
import TableBase from "../../components/common/TableBase";
import { useI18n } from "../../context/i18n.context";
import { extractApiError } from "../../lib/api";
import { formatCurrency } from "../../utils/currency";
import PropiedadForm from "./components/PropiedadForm";

const hoyISO = () => new Date().toISOString().slice(0, 10);
const hace30ISO = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
};

const ClienteDetallePage = () => {
  const { id } = useParams();
  const { t } = useI18n();

  const [modalPropiedad, setModalPropiedad] = useState(false);
  const [savingPropiedad, setSavingPropiedad] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [estadoCuentaDesde, setEstadoCuentaDesde] = useState(hace30ISO());
  const [estadoCuentaHasta, setEstadoCuentaHasta] = useState(hoyISO());

  const getIdiomaClienteLabel = (lang) =>
    lang === "en" ? t("clients.preferredLanguageEn") : t("clients.preferredLanguageEs");

  const getTipoClienteLabel = (value) =>
    value === "NO_HABITUAL" ? t("clients.quickNonHabitual") : t("clients.quickHabitual");

  const descargarEstadoCuenta = (lang) =>
    abrirEstadoCuentaRequest(id, {
      lang,
      desde: estadoCuentaDesde,
      hasta: estadoCuentaHasta,
    });

  const loadDetalle = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getClienteResumenRequest(id);
      setData(response);
    } catch (err) {
      setError(extractApiError(err, t("clients.detailLoadError")));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetalle();
  }, [id]);

  const handleCreatePropiedad = async (form) => {
    try {
      setSavingPropiedad(true);
      setError("");
      await createPropiedadRequest(form);
      setModalPropiedad(false);
      await loadDetalle();
    } catch (err) {
      setError(extractApiError(err, t("clients.propertySaveError")));
    } finally {
      setSavingPropiedad(false);
    }
  };

  if (loading) return <Loader text={t("common.loading")} />;

  if (!data) {
    return (
      <div className="space-y-4">
        <AlertMessage message={error} />
        <EmptyState
          title={t("clients.noInfoTitle")}
          description={t("clients.noInfoDescription")}
        />
      </div>
    );
  }

  const {
    cliente,
    propiedades,
    programaciones,
    ordenes,
    pagos,
    creditos,
    cobranza_seguimientos: cobranzaSeguimientos = [],
    resumen,
  } = data;

  const propiedadesColumns = [
    { key: "nombre_propiedad", label: t("clients.properties") },
    { key: "tipo_propiedad", label: t("clients.type") },
    { key: "direccion", label: t("clients.form.addressPlaceholder") },
    { key: "estado", label: t("clients.status"), render: (row) => row.estado || "-" },
  ];

  const programacionesColumns = [
    { key: "servicio", label: t("routes.services") },
    { key: "nombre_propiedad", label: t("routes.properties") },
    { key: "proxima_fecha", label: t("routes.schedules") },
    { key: "frecuencia", label: t("clients.frequency") },
    { key: "estado", label: t("clients.status") },
  ];

  const ordenesColumns = [
    { key: "numero_orden", label: t("routes.orders") },
    { key: "fecha_servicio", label: t("clients.date") },
    { key: "nombre_propiedad", label: t("routes.properties") },
    { key: "estado", label: t("clients.status") },
    {
      key: "total_orden",
      label: t("clients.total"),
      render: (row) => formatCurrency(row.total_orden),
    },
  ];

  const pagosColumns = [
    { key: "fecha_pago", label: t("clients.date") },
    { key: "metodo_pago", label: t("clients.method") },
    {
      key: "monto",
      label: t("clients.total"),
      render: (row) => formatCurrency(row.monto),
    },
    {
      key: "numero_orden",
      label: t("routes.orders"),
      render: (row) => row.numero_orden || "-",
    },
  ];

  const creditosColumns = [
    { key: "numero_orden", label: t("routes.orders") },
    {
      key: "monto_total",
      label: t("clients.total"),
      render: (row) => formatCurrency(row.monto_total),
    },
    {
      key: "saldo_pendiente",
      label: t("clients.balanceDue"),
      render: (row) => formatCurrency(row.saldo_pendiente),
    },
    { key: "fecha_vencimiento", label: t("clients.dueDate") },
    { key: "estado", label: t("clients.status") },
  ];

  const seguimientosColumns = [
    { key: "fecha_seguimiento", label: t("clients.date") },
    {
      key: "medio_contacto",
      label: t("clients.followUp.contactMethod"),
      render: (row) => t(`collections.followUp.methods.${row.medio_contacto}`),
    },
    {
      key: "resultado",
      label: t("clients.followUp.result"),
      render: (row) => t(`collections.followUp.results.${row.resultado}`),
    },
    {
      key: "proximo_contacto",
      label: t("clients.followUp.nextContact"),
      render: (row) => row.proximo_contacto || "-",
    },
    {
      key: "usuario_responsable",
      label: t("clients.followUp.owner"),
      render: (row) =>
        row.usuario_responsable || t("collections.followUp.unassignedOwner"),
    },
    {
      key: "numero_orden",
      label: t("routes.orders"),
      render: (row) => row.numero_orden || "-",
    },
    {
      key: "notas",
      label: t("clients.followUp.notes"),
      render: (row) => row.notas || "-",
    },
  ];

  return (
    <div className="space-y-6">
      <AlertMessage message={error} />

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold">{cliente.nombre_completo}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {cliente.nombre_empresa || t("clients.noCompany")} - {getTipoClienteLabel(cliente.tipo_cliente)}
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t("clients.phone")}</p>
            <p className="font-medium">{cliente.telefono || "-"}</p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t("clients.email")}</p>
            <p className="font-medium">{cliente.correo || "-"}</p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Tax ID</p>
            <p className="font-medium">{cliente.nit || "-"}</p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t("clients.idDocument")}</p>
            <p className="font-medium">{cliente.id_documento || "-"}</p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t("clients.status")}</p>
            <p className="font-medium">{cliente.estado}</p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 xl:col-span-2">
            <p className="text-xs text-slate-500">{t("clients.preferredLanguage")}</p>
            <p className="font-medium">{getIdiomaClienteLabel(cliente.idioma_preferido || "en")}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title={t("clients.totalPaid")} value={formatCurrency(resumen.total_pagado)} />
        <StatCard title={t("clients.balanceDue")} value={formatCurrency(resumen.saldo_pendiente)} />
        <StatCard title={t("clients.activeCredits")} value={resumen.creditos_activos} />
        <StatCard title={t("clients.orders")} value={resumen.total_ordenes} />
        <StatCard title={t("clients.activeSchedules")} value={resumen.programaciones_activas} />
      </div>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">{t("clients.accountStatement")}</h2>
            <p className="text-sm text-slate-500">{t("clients.accountStatementDescription")}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">{t("clients.from")}</span>
            <input
              type="date"
              value={estadoCuentaDesde}
              onChange={(e) => setEstadoCuentaDesde(e.target.value)}
              className="rounded-xl border px-4 py-3 outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">{t("clients.to")}</span>
            <input
              type="date"
              value={estadoCuentaHasta}
              onChange={(e) => setEstadoCuentaHasta(e.target.value)}
              className="rounded-xl border px-4 py-3 outline-none"
            />
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">{t("clients.language")}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => descargarEstadoCuenta()}
                className="flex-1 rounded-xl border px-3 py-3 text-sm hover:bg-slate-50"
                title={t("common.clientLanguage")}
              >
                {t("common.pdf")}
              </button>
              <button
                type="button"
                onClick={() => descargarEstadoCuenta("es")}
                className="rounded-xl border px-3 py-3 text-sm hover:bg-slate-50"
              >
                ES
              </button>
              <button
                type="button"
                onClick={() => descargarEstadoCuenta("en")}
                className="rounded-xl border px-3 py-3 text-sm hover:bg-slate-50"
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{t("clients.properties")}</h2>

          <button
            onClick={() => setModalPropiedad(true)}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
          >
            {t("clients.newProperty")}
          </button>
        </div>

        {propiedades?.length ? (
          <TableBase columns={propiedadesColumns} data={propiedades} />
        ) : (
          <EmptyState
            title={t("clients.noPropertiesTitle")}
            description={t("clients.noPropertiesDescription")}
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("clients.schedules")}</h2>
        {programaciones?.length ? (
          <TableBase columns={programacionesColumns} data={programaciones} />
        ) : (
          <EmptyState
            title={t("clients.noSchedulesTitle")}
            description={t("clients.noSchedulesDescription")}
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("clients.recentOrders")}</h2>
        {ordenes?.length ? (
          <TableBase columns={ordenesColumns} data={ordenes} />
        ) : (
          <EmptyState
            title={t("clients.noOrdersTitle")}
            description={t("clients.noOrdersDescription")}
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("clients.payments")}</h2>
        {pagos?.length ? (
          <TableBase columns={pagosColumns} data={pagos} />
        ) : (
          <EmptyState
            title={t("clients.noPaymentsTitle")}
            description={t("clients.noPaymentsDescription")}
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("clients.credits")}</h2>
        {creditos?.length ? (
          <TableBase columns={creditosColumns} data={creditos} />
        ) : (
          <EmptyState
            title={t("clients.noCreditsTitle")}
            description={t("clients.noCreditsDescription")}
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("clients.followUp.title")}</h2>
        <p className="text-sm text-slate-500">{t("clients.followUp.subtitle")}</p>
        {cobranzaSeguimientos?.length ? (
          <TableBase columns={seguimientosColumns} data={cobranzaSeguimientos} />
        ) : (
          <EmptyState
            title={t("clients.followUp.emptyTitle")}
            description={t("clients.followUp.emptyDescription")}
          />
        )}
      </section>

      {modalPropiedad && (
        <Modal title={t("clients.newProperty")} onClose={() => setModalPropiedad(false)}>
          <PropiedadForm
            idCliente={cliente.id_cliente}
            loading={savingPropiedad}
            onSubmit={handleCreatePropiedad}
            onCancel={() => setModalPropiedad(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default ClienteDetallePage;
