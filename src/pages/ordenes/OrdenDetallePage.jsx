import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  abrirInformeOrdenRequest,
  abrirTicketServicioRequest,
} from "../../api/documentos.api";
import { getOrdenByIdRequest } from "../../api/ordenes.api";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";
import PdfButtonGroup from "../../components/common/PdfButtonGroup";
import StatCard from "../../components/common/StatCard";
import TableBase from "../../components/common/TableBase";
import { useI18n } from "../../context/i18n.context";
import { formatCurrency } from "../../utils/currency";
import EvidenciasOrdenSection from "./components/EvidenciasOrdenSection";
import FinanzasOrdenSection from "./components/FinanzasOrdenSection";

const OrdenDetallePage = () => {
  const { id } = useParams();
  const { t } = useI18n();

  const [orden, setOrden] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrden = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getOrdenByIdRequest(id);
      setOrden(data);
    } catch (err) {
      setError(err?.response?.data?.error || t("orderDetail.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrden();
  }, [id]);

  if (loading) return <Loader text={t("orderDetail.loading")} />;

  if (error) {
    return <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>;
  }

  if (!orden) {
    return (
      <EmptyState
        title={t("orderDetail.noInfoTitle")}
        description={t("orderDetail.noInfoDescription")}
      />
    );
  }

  const detallesColumns = [
    { key: "servicio", label: t("orderDetail.service") },
    { key: "categoria_servicio", label: t("orderDetail.category") },
    {
      key: "descripcion_servicio",
      label: t("orderDetail.description"),
      render: (row) => row.descripcion_servicio || "-",
    },
    {
      key: "materiales",
      label: t("orderDetail.materials"),
      render: (row) =>
        row.requiere_materiales
          ? `${row.tipo_material || t("orderDetail.materialExtra")} (${formatCurrency(
              row.precio_material_extra || 0,
            )})`
          : "-",
    },
    { key: "cantidad", label: t("orderDetail.quantity") },
    {
      key: "precio_unitario",
      label: t("orderDetail.price"),
      render: (row) => formatCurrency(row.precio_unitario),
    },
    {
      key: "subtotal",
      label: t("orderDetail.subtotal"),
      render: (row) => formatCurrency(row.subtotal),
    },
    {
      key: "duracion_estimada_min",
      label: t("orderDetail.estimatedDuration"),
      render: (row) => (row.duracion_estimada_min ? `${row.duracion_estimada_min} min` : "-"),
    },
    {
      key: "duracion_real_min",
      label: t("orderDetail.actualDuration"),
      render: (row) => (row.duracion_real_min ? `${row.duracion_real_min} min` : "-"),
    },
    { key: "estado", label: t("orderDetail.status") },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{orden.numero_orden}</h1>
            <p className="text-sm text-slate-500">
              {orden.cliente} - {orden.nombre_propiedad}
            </p>
          </div>

          <span
            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${
              orden.estado === "COMPLETADA"
                ? "bg-green-100 text-green-700"
                : orden.estado === "CANCELADA"
                  ? "bg-red-100 text-red-700"
                  : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {orden.estado}
          </span>
        </div>

        <div className="mt-4 grid gap-3 border-t pt-4 md:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">
              {t("orderDetail.shortReceiptDescription")}
            </p>
            <PdfButtonGroup
              label={t("orderDetail.ticketLabel")}
              onDownload={(opts) => abrirTicketServicioRequest(orden.id_orden_trabajo, opts)}
            />
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">
              {t("orderDetail.fullReportDescription")}
            </p>
            <PdfButtonGroup
              label={t("orderDetail.reportLabel")}
              onDownload={(opts) => abrirInformeOrdenRequest(orden.id_orden_trabajo, opts)}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t("orderDetail.date")}</p>
            <p className="font-medium">{orden.fecha_servicio}</p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t("orderDetail.visitType")}</p>
            <p className="font-medium">{orden.tipo_visita}</p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t("orderDetail.origin")}</p>
            <p className="font-medium">{orden.origen}</p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t("orderDetail.assignmentSummary")}</p>
            <p className="font-medium">
              {orden.tecnicos || orden.cuadrilla || t("orderDetail.noAssignedEmployees")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title={t("orderDetail.subtotal")} value={formatCurrency(orden.subtotal)} />
        <StatCard title={t("orders.form.discount")} value={formatCurrency(orden.descuento)} />
        <StatCard title={t("clients.total")} value={formatCurrency(orden.total_orden)} />
        <StatCard
          title={t("orderDetail.actualDuration")}
          value={orden.duracion_real_min ? `${orden.duracion_real_min} min` : "-"}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("orderDetail.servicesTitle")}</h2>

        {orden.detalles?.length ? (
          <TableBase columns={detallesColumns} data={orden.detalles} />
        ) : (
          <EmptyState
            title={t("orderDetail.noServicesTitle")}
            description={t("orderDetail.noServicesDescription")}
          />
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">{t("orderDetail.previousNotes")}</h2>
          <p className="mt-2 text-sm text-slate-600">
            {orden.observaciones_previas || t("orderDetail.noPreviousNotes")}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">{t("orderDetail.finalNotes")}</h2>
          <p className="mt-2 text-sm text-slate-600">
            {orden.observaciones_finales || t("orderDetail.noFinalNotes")}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">{t("orderDetail.receptionTitle")}</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t("orderDetail.confirmedByClient")}</p>
            <p className="font-medium">
              {orden.confirmado_por_cliente ? t("orderDetail.yes") : t("orderDetail.no")}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t("orderDetail.receivedBy")}</p>
            <p className="font-medium">{orden.nombre_recibe || "-"}</p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t("orderDetail.signature")}</p>
            <p className="font-medium">
              {orden.firma_cliente_url
                ? t("orderDetail.registered")
                : t("orderDetail.notRegistered")}
            </p>
          </div>
        </div>
      </section>

      <FinanzasOrdenSection idOrden={orden.id_orden_trabajo} />
      <EvidenciasOrdenSection idOrden={orden.id_orden_trabajo} />
    </div>
  );
};

export default OrdenDetallePage;
