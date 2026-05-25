import { useMemo, useState } from "react";
import { abrirReciboAbonoRequest } from "../../api/documentos.api";
import {
  aplicarPagoCreditoRequest,
  changeEstadoCreditoRequest,
  getCreditosRequest,
} from "../../api/pagos.api";
import AlertMessage from "../../components/common/AlertMessage";
import ConfirmModal from "../../components/common/ConfirmModal";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";
import Pagination from "../../components/common/Pagination";
import PdfButtonGroup from "../../components/common/PdfButtonGroup";
import TableBase from "../../components/common/TableBase";
import { useI18n } from "../../context/i18n.context";
import { usePaginatedList } from "../../hooks/usePaginatedList";
import { extractApiError } from "../../lib/api";
import { formatCurrency } from "../../utils/currency";
import CreditoAbonoModal from "./components/CreditoAbonoModal";

const initialFilters = {
  estado: "",
  id_cliente: "",
  id_orden_trabajo: "",
  fecha_desde: "",
  fecha_hasta: "",
};

const initialAbono = {
  metodo_pago: "EFECTIVO",
  monto: "",
  referencia_pago: "",
  observaciones: "",
};

const CreditosPage = () => {
  const { t } = useI18n();
  const list = usePaginatedList({
    fetcher: getCreditosRequest,
    initialFilters,
    errorMessage: t("credits.loadError"),
  });

  const [abonoModalOpen, setAbonoModalOpen] = useState(false);
  const [ultimoAbonoId, setUltimoAbonoId] = useState(null);
  const [abonoTarget, setAbonoTarget] = useState(null);
  const [abonoForm, setAbonoForm] = useState(initialAbono);
  const [savingAbono, setSavingAbono] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [canceling, setCanceling] = useState(false);

  const handleFilter = (e) => {
    e.preventDefault();
    list.applyFilters();
  };

  const openAbonoModal = (credito) => {
    setAbonoTarget(credito);
    setAbonoForm(initialAbono);
    list.setError("");
    setAbonoModalOpen(true);
  };

  const handleAbonoChange = (e) => {
    const { name, value } = e.target;
    list.setError("");
    setAbonoForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitAbono = async () => {
    if (!abonoTarget) return;

    const monto = Number(abonoForm.monto);
    const saldoPendiente = Number(abonoTarget.saldo_pendiente);

    if (!monto || monto <= 0) {
      list.setError(t("credits.paymentAmountInvalid"));
      return;
    }

    if (monto > saldoPendiente) {
      list.setError(t("credits.paymentAmountExceeds"));
      return;
    }

    try {
      setSavingAbono(true);
      list.setError("");

      const respuesta = await aplicarPagoCreditoRequest({
        id_credito: abonoTarget.id_credito,
        metodo_pago: abonoForm.metodo_pago,
        monto,
        referencia_pago: abonoForm.referencia_pago || null,
        observaciones: abonoForm.observaciones || null,
      });

      setAbonoModalOpen(false);
      setAbonoTarget(null);
      setAbonoForm(initialAbono);
      list.reload();

      if (respuesta?.id_pago_credito) {
        setUltimoAbonoId(respuesta.id_pago_credito);
      }
    } catch (err) {
      list.setError(extractApiError(err, t("credits.paymentApplyError")));
    } finally {
      setSavingAbono(false);
    }
  };

  const handleCancelarCredito = async () => {
    if (!cancelTarget) return;

    try {
      setCanceling(true);
      list.setError("");

      await changeEstadoCreditoRequest(cancelTarget.id_credito, {
        estado: "CANCELADO",
      });

      setCancelTarget(null);
      list.reload();
    } catch (err) {
      list.setError(extractApiError(err, t("credits.cancelError")));
    } finally {
      setCanceling(false);
    }
  };

  const columns = useMemo(
    () => [
      { key: "id_credito", label: "ID" },
      { key: "cliente", label: t("payments.client") },
      { key: "numero_orden", label: t("agenda.order") },
      {
        key: "monto_total",
        label: t("credits.totalAmount"),
        render: (row) => formatCurrency(row.monto_total),
      },
      {
        key: "monto_pagado",
        label: t("credits.paid"),
        render: (row) => formatCurrency(row.monto_pagado),
      },
      {
        key: "saldo_pendiente",
        label: t("credits.balance"),
        render: (row) => formatCurrency(row.saldo_pendiente),
      },
      { key: "fecha_vencimiento", label: t("credits.dueDate") },
      {
        key: "estado",
        label: t("credits.status"),
        render: (row) => (
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
              row.estado === "PAGADO"
                ? "bg-green-100 text-green-700"
                : row.estado === "VENCIDO"
                ? "bg-red-100 text-red-700"
                : row.estado === "CANCELADO"
                ? "bg-slate-200 text-slate-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {row.estado}
          </span>
        ),
      },
    ],
    [t]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("credits.title")}</h1>
        <p className="text-sm text-slate-500">{t("credits.subtitle")}</p>
      </div>

      <AlertMessage message={list.error} />

      {ultimoAbonoId && (
        <div className="flex flex-col gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 md:flex-row md:items-center md:justify-between">
          <span>{t("credits.paymentBanner")}</span>
          <div className="flex items-center gap-2">
            <PdfButtonGroup
              label={t("payments.receipt")}
              onDownload={(opts) => abrirReciboAbonoRequest(ultimoAbonoId, opts)}
            />
            <button
              type="button"
              onClick={() => setUltimoAbonoId(null)}
              className="rounded-lg px-3 py-1.5 text-xs text-green-700 hover:bg-green-100"
              title={t("credits.hide")}
            >
              {t("credits.hide")}
            </button>
          </div>
        </div>
      )}

      <form
        onSubmit={handleFilter}
        className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-5"
      >
        <select
          value={list.filters.estado}
          onChange={(e) => list.setFilter("estado", e.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        >
          <option value="">{t("credits.allStatuses")}</option>
          <option value="PENDIENTE">PENDIENTE</option>
          <option value="PARCIAL">PARCIAL</option>
          <option value="PAGADO">PAGADO</option>
          <option value="VENCIDO">VENCIDO</option>
          <option value="CANCELADO">CANCELADO</option>
        </select>

        <input
          value={list.filters.id_cliente}
          onChange={(e) => list.setFilter("id_cliente", e.target.value)}
          placeholder={t("credits.clientId")}
          className="rounded-xl border px-4 py-3 outline-none"
        />

        <input
          value={list.filters.id_orden_trabajo}
          onChange={(e) => list.setFilter("id_orden_trabajo", e.target.value)}
          placeholder={t("credits.orderId")}
          className="rounded-xl border px-4 py-3 outline-none"
        />

        <input
          type="date"
          value={list.filters.fecha_desde}
          onChange={(e) => list.setFilter("fecha_desde", e.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        />

        <input
          type="date"
          value={list.filters.fecha_hasta}
          onChange={(e) => list.setFilter("fecha_hasta", e.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        />

        <button
          type="submit"
          className="rounded-xl border px-4 py-3 font-medium hover:bg-slate-50 md:col-span-5"
        >
          {t("credits.filter")}
        </button>
      </form>

      {list.loading && <Loader text={t("credits.loading")} />}

      {!list.loading && !list.error && list.items.length === 0 && (
        <EmptyState title={t("credits.emptyTitle")} description={t("credits.emptyDescription")} />
      )}

      {!list.loading && list.items.length > 0 && (
        <div className="space-y-1">
          <TableBase
            columns={columns}
            data={list.items}
            renderActions={(row) => (
              <div className="flex flex-wrap gap-2">
                {["PENDIENTE", "PARCIAL", "VENCIDO"].includes(row.estado) && (
                  <button
                    onClick={() => openAbonoModal(row)}
                    className="rounded-lg border px-3 py-1.5 text-xs hover:bg-green-50"
                  >
                    {t("credits.partialPayment")}
                  </button>
                )}

                {row.estado !== "PAGADO" && row.estado !== "CANCELADO" && (
                  <button
                    onClick={() => setCancelTarget(row)}
                    className="rounded-lg border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                  >
                    {t("credits.cancelCredit")}
                  </button>
                )}
              </div>
            )}
          />
          <Pagination pagination={list.pagination} onPageChange={list.setPage} />
        </div>
      )}

      {abonoModalOpen && abonoTarget ? (
        <CreditoAbonoModal
          credito={abonoTarget}
          form={abonoForm}
          error={list.error}
          loading={savingAbono}
          onChange={handleAbonoChange}
          onClose={() => {
            setAbonoModalOpen(false);
            setAbonoTarget(null);
            setAbonoForm(initialAbono);
          }}
          onSubmit={handleSubmitAbono}
        />
      ) : null}

      {cancelTarget && (
        <ConfirmModal
          title={t("credits.cancelModalTitle", { id: cancelTarget.id_credito })}
          message={t("credits.cancelModalMessage")}
          confirmLabel={t("credits.cancelCreditConfirm")}
          loading={canceling}
          onConfirm={handleCancelarCredito}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </div>
  );
};

export default CreditosPage;
