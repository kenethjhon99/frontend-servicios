import { useEffect, useState } from "react";
import { getResumenOrdenRequest } from "../../../api/resumenes.api";
import {
  aplicarPagoCreditoRequest,
  createCreditoRequest,
  createPagoRequest,
} from "../../../api/pagos.api";
import AlertMessage from "../../../components/common/AlertMessage";
import EmptyState from "../../../components/common/EmptyState";
import Loader from "../../../components/common/Loader";
import TableBase from "../../../components/common/TableBase";
import { useI18n } from "../../../context/i18n.context";
import { extractApiError } from "../../../lib/api";
import { formatCurrency } from "../../../utils/currency";

const initialPagoForm = {
  metodo_pago: "EFECTIVO",
  monto: "",
  referencia_pago: "",
  observaciones: "",
};

const initialCreditoForm = {
  monto_pagado: 0,
  dias_credito: 15,
  fecha_vencimiento: "",
  observaciones: "",
};

const initialAbonoForm = {
  metodo_pago: "EFECTIVO",
  monto: "",
  referencia_pago: "",
  observaciones: "",
};

const FinanzasOrdenSection = ({ idOrden }) => {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagoForm, setPagoForm] = useState(initialPagoForm);
  const [creditoForm, setCreditoForm] = useState(initialCreditoForm);
  const [abonoForm, setAbonoForm] = useState(initialAbonoForm);

  const loadResumen = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getResumenOrdenRequest(idOrden);
      setData(response);
    } catch (err) {
      setError(extractApiError(err, t("orderFinance.loadError")));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (idOrden) loadResumen();
  }, [idOrden]);

  const handlePagoChange = (event) => {
    setError("");
    setPagoForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleCreditoChange = (event) => {
    setError("");
    setCreditoForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleAbonoChange = (event) => {
    setError("");
    setAbonoForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const aplicarAbono = async (event) => {
    event.preventDefault();

    if (!data?.credito) {
      setError(t("orderFinance.noCreditAssociated"));
      return;
    }

    if (!abonoForm.monto || Number(abonoForm.monto) <= 0) {
      setError(t("orderFinance.partialPaymentInvalid"));
      return;
    }

    if (Number(abonoForm.monto) > Number(data.credito.saldo_pendiente)) {
      setError(t("orderFinance.partialPaymentExceeds"));
      return;
    }

    try {
      setError("");
      await aplicarPagoCreditoRequest({
        id_credito: data.credito.id_credito,
        metodo_pago: abonoForm.metodo_pago,
        monto: Number(abonoForm.monto),
        referencia_pago: abonoForm.referencia_pago || null,
        observaciones: abonoForm.observaciones || "Abono registrado desde detalle de orden",
      });

      setAbonoForm(initialAbonoForm);
      await loadResumen();
    } catch (err) {
      setError(extractApiError(err, t("orderFinance.partialPaymentError")));
    }
  };

  const registrarPago = async (event) => {
    event.preventDefault();

    if (!pagoForm.monto || Number(pagoForm.monto) <= 0) {
      setError(t("orderFinance.directPaymentInvalid"));
      return;
    }

    try {
      setError("");
      await createPagoRequest({
        id_cliente: data.orden.id_cliente,
        id_orden_trabajo: data.orden.id_orden_trabajo,
        metodo_pago: pagoForm.metodo_pago,
        monto: Number(pagoForm.monto),
        referencia_pago: pagoForm.referencia_pago || null,
        observaciones: pagoForm.observaciones || null,
      });

      setPagoForm(initialPagoForm);
      await loadResumen();
    } catch (err) {
      setError(extractApiError(err, t("orderFinance.directPaymentError")));
    }
  };

  const crearCredito = async (event) => {
    event.preventDefault();

    if (!creditoForm.fecha_vencimiento) {
      setError(t("orderFinance.creditDueDateRequired"));
      return;
    }

    try {
      setError("");
      await createCreditoRequest({
        id_cliente: data.orden.id_cliente,
        id_orden_trabajo: data.orden.id_orden_trabajo,
        monto_total: data.resumen_financiero.saldo_general_orden,
        monto_pagado: Number(creditoForm.monto_pagado || 0),
        dias_credito: Number(creditoForm.dias_credito || 0),
        fecha_vencimiento: creditoForm.fecha_vencimiento,
        observaciones: creditoForm.observaciones || null,
      });

      setCreditoForm(initialCreditoForm);
      await loadResumen();
    } catch (err) {
      setError(extractApiError(err, t("orderFinance.creditCreateError")));
    }
  };

  if (loading) return <Loader text={t("orderFinance.loading")} />;

  if (!data) {
    return (
      <div className="space-y-4">
        <AlertMessage message={error} />
        <EmptyState
          title={t("orderFinance.noSummaryTitle")}
          description={t("orderFinance.noSummaryDescription")}
        />
      </div>
    );
  }

  const resumen = data.resumen_financiero;

  const pagosColumns = [
    { key: "fecha_pago", label: t("orderFinance.date") },
    { key: "metodo_pago", label: t("orderFinance.method") },
    {
      key: "monto",
      label: t("orderFinance.amount"),
      render: (row) => formatCurrency(row.monto),
    },
    {
      key: "referencia_pago",
      label: t("orderFinance.reference"),
      render: (row) => row.referencia_pago || "-",
    },
  ];

  const pagosCreditoColumns = [
    { key: "fecha_pago", label: t("orderFinance.date") },
    { key: "metodo_pago", label: t("orderFinance.method") },
    {
      key: "monto_aplicado",
      label: t("orderFinance.appliedAmount"),
      render: (row) => formatCurrency(row.monto_aplicado),
    },
    {
      key: "referencia_pago",
      label: t("orderFinance.reference"),
      render: (row) => row.referencia_pago || "-",
    },
  ];

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{t("orderFinance.title")}</h2>
        <p className="text-sm text-slate-500">{t("orderFinance.subtitle")}</p>
      </div>

      <AlertMessage message={error} />

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-slate-500">{t("orderFinance.orderTotal")}</p>
          <h3 className="text-xl font-bold">{formatCurrency(resumen.total_orden)}</h3>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-slate-500">{t("orderFinance.directPaid")}</p>
          <h3 className="text-xl font-bold">{formatCurrency(resumen.total_pagado_directo)}</h3>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-slate-500">{t("orderFinance.creditPaid")}</p>
          <h3 className="text-xl font-bold">{formatCurrency(resumen.total_pagado_credito)}</h3>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-slate-500">{t("orderFinance.totalReceived")}</p>
          <h3 className="text-xl font-bold">{formatCurrency(resumen.total_recibido)}</h3>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-slate-500">{t("orderFinance.creditBalance")}</p>
          <h3 className="text-xl font-bold">{formatCurrency(resumen.saldo_pendiente_credito)}</h3>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-slate-500">{t("orderFinance.generalBalance")}</p>
          <h3 className="text-xl font-bold">{formatCurrency(resumen.saldo_general_orden)}</h3>
        </div>
      </div>

      {resumen.saldo_general_orden > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <form onSubmit={registrarPago} className="space-y-3 rounded-2xl border bg-white p-4">
            <h3 className="font-semibold">{t("orderFinance.registerDirectPayment")}</h3>

            <select
              name="metodo_pago"
              value={pagoForm.metodo_pago}
              onChange={handlePagoChange}
              className="w-full rounded-xl border px-4 py-3"
            >
              <option value="EFECTIVO">EFECTIVO</option>
              <option value="TRANSFERENCIA">TRANSFERENCIA</option>
              <option value="CHEQUE">CHEQUE</option>
              <option value="DEPOSITO">DEPOSITO</option>
              <option value="TARJETA">TARJETA</option>
              <option value="OTRO">OTRO</option>
            </select>

            <input
              name="monto"
              type="number"
              value={pagoForm.monto}
              onChange={handlePagoChange}
              placeholder={t("orderFinance.amountPlaceholder")}
              className="w-full rounded-xl border px-4 py-3"
            />

            <input
              name="referencia_pago"
              value={pagoForm.referencia_pago}
              onChange={handlePagoChange}
              placeholder={t("orderFinance.referencePlaceholder")}
              className="w-full rounded-xl border px-4 py-3"
            />

            <textarea
              name="observaciones"
              value={pagoForm.observaciones}
              onChange={handlePagoChange}
              placeholder={t("orderFinance.notesPlaceholder")}
              rows={2}
              className="w-full rounded-xl border px-4 py-3"
            />

            <button className="w-full rounded-xl bg-slate-900 px-4 py-3 text-white">
              {t("orderFinance.savePayment")}
            </button>
          </form>

          {!data.credito && (
            <form onSubmit={crearCredito} className="space-y-3 rounded-2xl border bg-white p-4">
              <h3 className="font-semibold">{t("orderFinance.createCredit")}</h3>

              <div className="rounded-xl bg-slate-50 p-3 text-sm">
                {t("orderFinance.creditAmount", {
                  value: formatCurrency(resumen.saldo_general_orden),
                })}
              </div>

              <input
                name="monto_pagado"
                type="number"
                value={creditoForm.monto_pagado}
                onChange={handleCreditoChange}
                placeholder={t("orderFinance.initialPaymentPlaceholder")}
                className="w-full rounded-xl border px-4 py-3"
              />

              <input
                name="dias_credito"
                type="number"
                value={creditoForm.dias_credito}
                onChange={handleCreditoChange}
                placeholder={t("orderFinance.creditDaysPlaceholder")}
                className="w-full rounded-xl border px-4 py-3"
              />

              <input
                name="fecha_vencimiento"
                type="date"
                value={creditoForm.fecha_vencimiento}
                onChange={handleCreditoChange}
                className="w-full rounded-xl border px-4 py-3"
              />

              <textarea
                name="observaciones"
                value={creditoForm.observaciones}
                onChange={handleCreditoChange}
                placeholder={t("orderFinance.notesPlaceholder")}
                rows={2}
                className="w-full rounded-xl border px-4 py-3"
              />

              <button className="w-full rounded-xl bg-slate-900 px-4 py-3 text-white">
                {t("orderFinance.createCreditAction")}
              </button>
            </form>
          )}
        </div>
      )}

      {data.credito && (
        <div className="rounded-2xl border bg-white p-4">
          <h3 className="font-semibold">{t("orderFinance.linkedCredit")}</h3>

          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">{t("orderFinance.totalAmount")}</p>
              <p className="font-bold">{formatCurrency(data.credito.monto_total)}</p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">{t("orderFinance.paid")}</p>
              <p className="font-bold">{formatCurrency(data.credito.monto_pagado)}</p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">{t("orderFinance.balance")}</p>
              <p className="font-bold">{formatCurrency(data.credito.saldo_pendiente)}</p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">{t("orderFinance.status")}</p>
              <p className="font-bold">{data.credito.estado}</p>
            </div>
          </div>

          {["PENDIENTE", "PARCIAL", "VENCIDO"].includes(data.credito.estado) && (
            <form
              onSubmit={aplicarAbono}
              className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2"
            >
              <h4 className="font-semibold md:col-span-2">{t("orderFinance.applyPayment")}</h4>

              <select
                name="metodo_pago"
                value={abonoForm.metodo_pago}
                onChange={handleAbonoChange}
                className="rounded-xl border bg-white px-4 py-3"
              >
                <option value="EFECTIVO">EFECTIVO</option>
                <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                <option value="CHEQUE">CHEQUE</option>
                <option value="DEPOSITO">DEPOSITO</option>
                <option value="TARJETA">TARJETA</option>
                <option value="OTRO">OTRO</option>
              </select>

              <input
                name="monto"
                type="number"
                value={abonoForm.monto}
                onChange={handleAbonoChange}
                placeholder={t("orderFinance.maxAmountPlaceholder", {
                  value: formatCurrency(data.credito.saldo_pendiente),
                })}
                className="rounded-xl border bg-white px-4 py-3"
              />

              <input
                name="referencia_pago"
                value={abonoForm.referencia_pago}
                onChange={handleAbonoChange}
                placeholder={t("orderFinance.referencePlaceholder")}
                className="rounded-xl border bg-white px-4 py-3 md:col-span-2"
              />

              <textarea
                name="observaciones"
                value={abonoForm.observaciones}
                onChange={handleAbonoChange}
                placeholder={t("orderFinance.notesPlaceholder")}
                rows={2}
                className="rounded-xl border bg-white px-4 py-3 md:col-span-2"
              />

              <button className="rounded-xl bg-slate-900 px-4 py-3 text-white md:col-span-2">
                {t("orderFinance.applyPaymentAction")}
              </button>
            </form>
          )}
        </div>
      )}

      <section className="space-y-3">
        <h3 className="font-semibold">{t("orderFinance.directPayments")}</h3>
        {data.pagos_directos?.length ? (
          <TableBase columns={pagosColumns} data={data.pagos_directos} />
        ) : (
          <EmptyState
            title={t("orderFinance.noDirectPaymentsTitle")}
            description={t("orderFinance.noDirectPaymentsDescription")}
          />
        )}
      </section>

      {data.credito && (
        <section className="space-y-3">
          <h3 className="font-semibold">{t("orderFinance.creditPayments")}</h3>
          {data.pagos_credito?.length ? (
            <TableBase columns={pagosCreditoColumns} data={data.pagos_credito} />
          ) : (
            <EmptyState
              title={t("orderFinance.noCreditPaymentsTitle")}
              description={t("orderFinance.noCreditPaymentsDescription")}
            />
          )}
        </section>
      )}
    </section>
  );
};

export default FinanzasOrdenSection;
