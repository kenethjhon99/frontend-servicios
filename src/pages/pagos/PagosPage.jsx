import { useEffect, useMemo, useState } from "react";
import { getClientesRequest } from "../../api/clientes.api";
import { getOrdenByIdRequest, getOrdenesRequest } from "../../api/ordenes.api";
import { abrirReciboPagoRequest } from "../../api/documentos.api";
import { createPagoRequest, getPagosRequest } from "../../api/pagos.api";
import AlertMessage from "../../components/common/AlertMessage";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";
import Pagination from "../../components/common/Pagination";
import PdfButtonGroup from "../../components/common/PdfButtonGroup";
import TableBase from "../../components/common/TableBase";
import { useI18n } from "../../context/i18n.context";
import { usePaginatedList } from "../../hooks/usePaginatedList";
import { extractApiError } from "../../lib/api";
import { formatCurrency } from "../../utils/currency";

const initialForm = {
  id_cliente: "",
  id_orden_trabajo: "",
  fecha_pago: "",
  metodo_pago: "EFECTIVO",
  monto: "",
  referencia_pago: "",
  observaciones: "",
};

const initialFilters = {
  id_cliente: "",
  id_orden_trabajo: "",
  metodo_pago: "",
  fecha_desde: "",
  fecha_hasta: "",
};

const PagosPage = () => {
  const { t } = useI18n();
  const list = usePaginatedList({
    fetcher: getPagosRequest,
    initialFilters,
    errorMessage: t("payments.loadError"),
  });

  const [clientes, setClientes] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    const loadBaseData = async () => {
      try {
        const [clientesRes, ordenesRes] = await Promise.all([
          getClientesRequest({ estado: "ACTIVO", limit: 200 }),
          getOrdenesRequest({ limit: 200 }),
        ]);

        setClientes(clientesRes.data);
        setOrdenes(ordenesRes.data);
      } catch (err) {
        list.setError(extractApiError(err, t("payments.loadBaseError")));
      }
    };
    loadBaseData();
  }, []);

  useEffect(() => {
    const loadOrdenSeleccionada = async () => {
      if (!form.id_orden_trabajo) {
        setOrdenSeleccionada(null);
        return;
      }

      try {
        const data = await getOrdenByIdRequest(form.id_orden_trabajo);
        setOrdenSeleccionada(data);
      } catch (err) {
        setOrdenSeleccionada(null);
        list.setError(extractApiError(err, t("payments.loadOrderError")));
      }
    };

    loadOrdenSeleccionada();
  }, [form.id_orden_trabajo]);

  useEffect(() => {
    if (!ordenSeleccionada || form.monto) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      monto: String(ordenSeleccionada.total_orden || ""),
    }));
  }, [ordenSeleccionada, form.monto]);

  const handleFilter = (e) => {
    e.preventDefault();
    list.applyFilters();
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    list.setError("");
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "id_cliente" ? { id_orden_trabajo: "" } : {}),
    }));
  };

  const handleCreatePago = async (e) => {
    e.preventDefault();

    if (!form.id_cliente || !form.monto) {
      list.setError(t("payments.clientAmountRequired"));
      return;
    }

    try {
      list.setError("");
      await createPagoRequest({
        id_cliente: Number(form.id_cliente),
        id_orden_trabajo: form.id_orden_trabajo ? Number(form.id_orden_trabajo) : null,
        fecha_pago: form.fecha_pago || null,
        metodo_pago: form.metodo_pago,
        monto: Number(form.monto),
        referencia_pago: form.referencia_pago || null,
        observaciones: form.observaciones || null,
      });

      setForm(initialForm);
      list.reload();
    } catch (err) {
      list.setError(extractApiError(err, t("payments.createError")));
    }
  };

  const ordenesDelCliente = form.id_cliente
    ? ordenes.filter((orden) => String(orden.id_cliente) === String(form.id_cliente))
    : ordenes;
  const clienteSeleccionado = clientes.find(
    (cliente) => String(cliente.id_cliente) === String(form.id_cliente)
  );

  const columns = useMemo(
    () => [
      { key: "fecha_pago", label: t("payments.date") },
      { key: "cliente", label: t("payments.client") },
      {
        key: "numero_orden",
        label: t("payments.order"),
        render: (row) => row.numero_orden || "-",
      },
      { key: "metodo_pago", label: t("payments.method") },
      {
        key: "monto",
        label: t("payments.amount"),
        render: (row) => formatCurrency(row.monto),
      },
      {
        key: "referencia_pago",
        label: t("payments.reference"),
        render: (row) => row.referencia_pago || "-",
      },
    ],
    [t]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("payments.title")}</h1>
        <p className="text-sm text-slate-500">{t("payments.subtitle")}</p>
      </div>

      <AlertMessage message={list.error} />

      <form
        onSubmit={handleCreatePago}
        className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-3"
      >
        <h2 className="text-lg font-semibold md:col-span-3">{t("payments.register")}</h2>

        <select
          name="id_cliente"
          value={form.id_cliente}
          onChange={handleFormChange}
          className="rounded-xl border px-4 py-3 outline-none"
        >
          <option value="">{t("payments.selectClient")}</option>
          {clientes.map((cliente) => (
            <option key={cliente.id_cliente} value={cliente.id_cliente}>
              {cliente.nombre_completo}
            </option>
          ))}
        </select>

        <select
          name="id_orden_trabajo"
          value={form.id_orden_trabajo}
          onChange={handleFormChange}
          className="rounded-xl border px-4 py-3 outline-none"
        >
          <option value="">{t("payments.optionalOrder")}</option>
          {ordenesDelCliente.map((orden) => (
            <option key={orden.id_orden_trabajo} value={orden.id_orden_trabajo}>
              {orden.numero_orden} - {orden.cliente}
            </option>
          ))}
        </select>

        <div className="rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-slate-600 md:col-span-3">
          {!form.id_cliente && t("payments.selectClientHint")}
          {form.id_cliente && !form.id_orden_trabajo && (
            <>
              <p className="font-semibold text-slate-900">
                {clienteSeleccionado?.nombre_completo || t("payments.selectedClient")}
              </p>
              <p className="mt-1">
                {t("payments.availableOrders", { count: ordenesDelCliente.length })}
              </p>
              {ordenesDelCliente.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {ordenesDelCliente.slice(0, 3).map((orden) => (
                    <li key={orden.id_orden_trabajo}>
                      {orden.numero_orden} - {formatCurrency(orden.total_orden)} - {orden.estado}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {form.id_orden_trabajo && ordenSeleccionada && (
            <>
              <p className="font-semibold text-slate-900">
                {t("payments.collectingOrder", { number: ordenSeleccionada.numero_orden })}
              </p>
              <p className="mt-1">
                {t("payments.totalToCollect", {
                  value: formatCurrency(ordenSeleccionada.total_orden),
                })}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                {t("payments.whyCollecting")}
              </p>
              <ul className="mt-2 space-y-1">
                {ordenSeleccionada.detalles?.map((detalle) => (
                  <li key={detalle.id_orden_detalle}>
                    {detalle.servicio} x{detalle.cantidad} - {formatCurrency(detalle.subtotal)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <input
          type="date"
          name="fecha_pago"
          value={form.fecha_pago}
          onChange={handleFormChange}
          className="rounded-xl border px-4 py-3 outline-none"
        />

        <select
          name="metodo_pago"
          value={form.metodo_pago}
          onChange={handleFormChange}
          className="rounded-xl border px-4 py-3 outline-none"
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
          value={form.monto}
          onChange={handleFormChange}
          placeholder={t("payments.amount")}
          className="rounded-xl border px-4 py-3 outline-none"
        />

        <input
          name="referencia_pago"
          value={form.referencia_pago}
          onChange={handleFormChange}
          placeholder={t("payments.reference")}
          className="rounded-xl border px-4 py-3 outline-none"
        />

        <textarea
          name="observaciones"
          value={form.observaciones}
          onChange={handleFormChange}
          placeholder={t("payments.notes")}
          className="rounded-xl border px-4 py-3 outline-none md:col-span-3"
          rows={2}
        />

        <button
          type="submit"
          className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white md:col-span-3"
        >
          {t("payments.submit")}
        </button>
      </form>

      <form
        onSubmit={handleFilter}
        className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-5"
      >
        <select
          value={list.filters.id_cliente}
          onChange={(e) => list.setFilter("id_cliente", e.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        >
          <option value="">{t("payments.allClients")}</option>
          {clientes.map((cliente) => (
            <option key={cliente.id_cliente} value={cliente.id_cliente}>
              {cliente.nombre_completo}
            </option>
          ))}
        </select>

        <input
          value={list.filters.id_orden_trabajo}
          onChange={(e) => list.setFilter("id_orden_trabajo", e.target.value)}
          placeholder={t("payments.orderId")}
          className="rounded-xl border px-4 py-3 outline-none"
        />

        <select
          value={list.filters.metodo_pago}
          onChange={(e) => list.setFilter("metodo_pago", e.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        >
          <option value="">{t("payments.allMethods")}</option>
          <option value="EFECTIVO">EFECTIVO</option>
          <option value="TRANSFERENCIA">TRANSFERENCIA</option>
          <option value="CHEQUE">CHEQUE</option>
          <option value="DEPOSITO">DEPOSITO</option>
          <option value="TARJETA">TARJETA</option>
          <option value="OTRO">OTRO</option>
        </select>

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
          {t("common.filter")}
        </button>
      </form>

      {list.loading && <Loader text={t("payments.loading")} />}

      {!list.loading && !list.error && list.items.length === 0 && (
        <EmptyState title={t("payments.emptyTitle")} description={t("payments.emptyDescription")} />
      )}

      {!list.loading && list.items.length > 0 && (
        <div className="space-y-1">
          <TableBase
            columns={columns}
            data={list.items}
            renderActions={(row) => (
              <PdfButtonGroup
                label={t("payments.receipt")}
                onDownload={(opts) => abrirReciboPagoRequest(row.id_pago, opts)}
              />
            )}
          />
          <Pagination pagination={list.pagination} onPageChange={list.setPage} />
        </div>
      )}
    </div>
  );
};

export default PagosPage;
