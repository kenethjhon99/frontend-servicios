import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getClientesRequest } from "../../api/clientes.api";
import {
  changeEstadoCotizacionRequest,
  createCotizacionRequest,
  getCotizacionesRequest,
  updateCotizacionRequest,
} from "../../api/cotizaciones.api";
import AlertMessage from "../../components/common/AlertMessage";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";
import Pagination from "../../components/common/Pagination";
import TableBase from "../../components/common/TableBase";
import { useI18n } from "../../context/i18n.context";
import { useToast } from "../../context/toast.context";
import { usePaginatedList } from "../../hooks/usePaginatedList";
import { extractApiError } from "../../lib/api";
import { formatCurrency } from "../../utils/currency";
import CotizacionForm from "./components/CotizacionForm";

const initialFilters = {
  estado: "",
  id_cliente: "",
  fecha_desde: "",
  fecha_hasta: "",
};

const badgeClassByEstado = {
  BORRADOR: "bg-slate-200 text-slate-700",
  ENVIADA: "bg-blue-100 text-blue-700",
  APROBADA: "bg-green-100 text-green-700",
  RECHAZADA: "bg-red-100 text-red-700",
  VENCIDA: "bg-yellow-100 text-yellow-700",
  CONVERTIDA: "bg-violet-100 text-violet-700",
};

const CotizacionesPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useI18n();
  const [clientes, setClientes] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCotizacion, setEditingCotizacion] = useState(null);
  const [saving, setSaving] = useState(false);

  const getEstadoCotizacionLabel = (estado) =>
    estado === "BORRADOR" ? t("quotes.pending").toUpperCase() : estado;

  const list = usePaginatedList({
    fetcher: getCotizacionesRequest,
    initialFilters,
    errorMessage: t("quotes.loadError"),
  });

  useEffect(() => {
    const loadClientes = async () => {
      try {
        const { data } = await getClientesRequest({ estado: "ACTIVO" });
        setClientes(Array.isArray(data) ? data : []);
      } catch (_error) {
        setClientes([]);
      }
    };

    loadClientes();
  }, []);

  const handleSaveCotizacion = async (form) => {
    try {
      setSaving(true);
      list.setError("");

      if (editingCotizacion) {
        await updateCotizacionRequest(editingCotizacion.id_cotizacion, form);
        toast.success(t("quotes.saveEdit"));
      } else {
        await createCotizacionRequest(form);
        toast.success(t("quotes.saveNew"));
      }

      setModalOpen(false);
      setEditingCotizacion(null);
      list.reload();
    } catch (err) {
      const message = extractApiError(err, t("quotes.saveError"));
      list.setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCambioEstado = async (row, estado) => {
    try {
      list.setError("");
      await changeEstadoCotizacionRequest(row.id_cotizacion, { estado });
      toast.success(t("quotes.updateTo", { number: row.numero_cotizacion, state: estado }));
      list.reload();
    } catch (err) {
      const message = extractApiError(err, t("quotes.changeError"));
      list.setError(message);
      toast.error(message);
    }
  };

  const quickFilters = [
    { label: t("quotes.pending"), apply: () => list.setFilter("estado", "PENDIENTE") },
    { label: t("quotes.sent"), apply: () => list.setFilter("estado", "ENVIADA") },
    { label: t("quotes.approved"), apply: () => list.setFilter("estado", "APROBADA") },
    {
      label: t("quotes.clear"),
      apply: () => {
        list.setFilter("estado", "");
        list.setFilter("id_cliente", "");
        list.setFilter("fecha_desde", "");
        list.setFilter("fecha_hasta", "");
      },
    },
  ];

  const columns = useMemo(
    () => [
      { key: "numero_cotizacion", label: t("quotes.quoteNumber") },
      { key: "fecha_cotizacion", label: t("quotes.date") },
      { key: "cliente", label: t("orders.client") },
      {
        key: "nombre_propiedad",
        label: t("quotes.property"),
        render: (row) => row.nombre_propiedad || "-",
      },
      {
        key: "vigencia_hasta",
        label: t("quotes.validity"),
        render: (row) => row.vigencia_hasta || "-",
      },
      {
        key: "total",
        label: t("quotes.total"),
        render: (row) => formatCurrency(row.total),
      },
      {
        key: "estado",
        label: t("orders.status"),
        render: (row) => (
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
              badgeClassByEstado[row.estado] || badgeClassByEstado.BORRADOR
            }`}
          >
            {getEstadoCotizacionLabel(row.estado)}
          </span>
        ),
      },
    ],
    [t]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("quotes.title")}</h1>
          <p className="text-sm text-slate-500">{t("quotes.subtitle")}</p>
        </div>

        <button
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
          onClick={() => {
            setEditingCotizacion(null);
            setModalOpen(true);
          }}
        >
          {t("quotes.new")}
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          list.applyFilters();
        }}
        className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-5"
      >
        <select
          value={list.filters.estado}
          onChange={(e) => list.setFilter("estado", e.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        >
          <option value="">{t("quotes.allStatuses")}</option>
          <option value="PENDIENTE">{t("quotes.pending").toUpperCase()}</option>
          <option value="ENVIADA">{t("quotes.sent").toUpperCase()}</option>
          <option value="APROBADA">{t("quotes.approved").toUpperCase()}</option>
          <option value="RECHAZADA">{t("quotes.rejected").toUpperCase()}</option>
          <option value="VENCIDA">{t("quotes.expired").toUpperCase()}</option>
          <option value="CONVERTIDA">{t("quotes.converted").toUpperCase()}</option>
        </select>

        <select
          value={list.filters.id_cliente}
          onChange={(e) => list.setFilter("id_cliente", e.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        >
          <option value="">{t("quotes.allClients")}</option>
          {clientes.map((cliente) => (
            <option key={cliente.id_cliente} value={cliente.id_cliente}>
              {cliente.nombre_completo}
            </option>
          ))}
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
          className="rounded-xl border px-4 py-3 font-medium hover:bg-slate-50"
        >
          {t("common.filter")}
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {quickFilters.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.apply}
            className="rounded-full border bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 hover:bg-slate-50"
          >
            {item.label}
          </button>
        ))}
      </div>

      {!list.loading && (
        <div className="surface-card rounded-[1.5rem] bg-white px-4 py-3 text-sm text-slate-600">
          {t("quotes.filterSummary", { count: list.pagination.total })}
        </div>
      )}

      {list.loading && <Loader text={t("quotes.loading")} />}

      {!list.loading && <AlertMessage message={list.error} />}

      {!list.loading && !list.error && list.items.length === 0 && (
        <EmptyState title={t("quotes.emptyTitle")} description={t("quotes.emptyDescription")} />
      )}

      {!list.loading && !list.error && list.items.length > 0 && (
        <div className="space-y-1">
          <TableBase
            columns={columns}
            data={list.items}
            renderActions={(row) => (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => navigate(`/cotizaciones/${row.id_cotizacion}`)}
                  className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                >
                  {t("quotes.detail")}
                </button>

                {row.estado === "BORRADOR" && (
                  <>
                    <button
                      onClick={() => {
                        setEditingCotizacion(row);
                        setModalOpen(true);
                      }}
                      className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                    >
                      {t("quotes.edit")}
                    </button>
                    <button
                      onClick={() => handleCambioEstado(row, "ENVIADA")}
                      className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-blue-50"
                    >
                      {t("quotes.send")}
                    </button>
                  </>
                )}

                {row.estado === "ENVIADA" && (
                  <>
                    <button
                      onClick={() => handleCambioEstado(row, "APROBADA")}
                      className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-green-50"
                    >
                      {t("quotes.approve")}
                    </button>
                    <button
                      onClick={() => handleCambioEstado(row, "RECHAZADA")}
                      className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      {t("quotes.reject")}
                    </button>
                  </>
                )}
              </div>
            )}
          />
          <Pagination pagination={list.pagination} onPageChange={list.setPage} />
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editingCotizacion ? t("quotes.edit") : t("quotes.new")}
          onClose={() => {
            setModalOpen(false);
            setEditingCotizacion(null);
          }}
        >
          <CotizacionForm
            initialData={editingCotizacion}
            loading={saving}
            submitLabel={editingCotizacion ? t("quotes.edit") : t("quotes.new")}
            onSubmit={handleSaveCotizacion}
            onCancel={() => {
              setModalOpen(false);
              setEditingCotizacion(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
};

export default CotizacionesPage;
