import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createClienteRequest,
  getClientesRequest,
  updateClienteRequest,
} from "../../api/clientes.api";
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
import ClienteForm from "./components/ClienteForm";

const initialFilters = {
  busqueda: "",
  estado: "",
  tipo_cliente: "",
};

const ClientesPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useI18n();

  const list = usePaginatedList({
    fetcher: getClientesRequest,
    initialFilters,
    errorMessage: t("clients.loadError"),
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditingCliente(null);
    setModalOpen(true);
  };

  const openEdit = (cliente) => {
    setEditingCliente(cliente);
    setModalOpen(true);
  };

  const getTipoClienteLabel = (value) =>
    value === "NO_HABITUAL" ? t("clients.quickNonHabitual") : t("clients.quickHabitual");

  const getEstadoLabel = (value) =>
    value === "ACTIVO" ? t("clients.activeStatus") : t("clients.inactiveStatus");

  const handleSaveCliente = async (form) => {
    try {
      setSaving(true);
      list.setError("");

      if (editingCliente) {
        await updateClienteRequest(editingCliente.id_cliente, form);
        toast.success(t("clients.updated"));
      } else {
        await createClienteRequest(form);
        toast.success(t("clients.created"));
      }

      setModalOpen(false);
      setEditingCliente(null);
      list.reload();
    } catch (err) {
      const msg = extractApiError(err, t("clients.saveError"));
      list.setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    list.applyFilters();
  };

  const quickFilters = [
    { label: t("clients.quickActive"), apply: () => list.setFilter("estado", "ACTIVO") },
    { label: t("clients.quickHabitual"), apply: () => list.setFilter("tipo_cliente", "HABITUAL") },
    { label: t("clients.quickNonHabitual"), apply: () => list.setFilter("tipo_cliente", "NO_HABITUAL") },
    {
      label: t("clients.quickClear"),
      apply: () => {
        list.setFilter("busqueda", "");
        list.setFilter("estado", "");
        list.setFilter("tipo_cliente", "");
      },
    },
  ];

  const columns = useMemo(
    () => [
      {
        key: "codigo_cliente",
        label: t("clients.code"),
        render: (row) => row.codigo_cliente || "-",
      },
      { key: "nombre_completo", label: t("clients.name") },
      {
        key: "nombre_empresa",
        label: t("clients.company"),
        render: (row) => row.nombre_empresa || "-",
      },
      {
        key: "telefono",
        label: t("clients.phone"),
        render: (row) => row.telefono || "-",
      },
      {
        key: "tipo_cliente",
        label: t("clients.type"),
        render: (row) => getTipoClienteLabel(row.tipo_cliente),
      },
      {
        key: "estado",
        label: t("clients.status"),
        render: (row) => (
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
              row.estado === "ACTIVO"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {getEstadoLabel(row.estado)}
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
          <h1 className="text-2xl font-bold">{t("clients.title")}</h1>
          <p className="text-sm text-slate-500">{t("clients.subtitle")}</p>
        </div>

        <button
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
          onClick={openCreate}
        >
          {t("clients.new")}
        </button>
      </div>

      <form
        onSubmit={handleSearch}
        className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-4"
      >
        <input
          type="text"
          placeholder={t("clients.searchPlaceholder")}
          value={list.filters.busqueda}
          onChange={(e) => list.setFilter("busqueda", e.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        />

        <select
          value={list.filters.estado}
          onChange={(e) => list.setFilter("estado", e.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        >
          <option value="">{t("clients.allStatuses")}</option>
          <option value="ACTIVO">{t("clients.activeStatus")}</option>
          <option value="INACTIVO">{t("clients.inactiveStatus")}</option>
        </select>

        <select
          value={list.filters.tipo_cliente}
          onChange={(e) => list.setFilter("tipo_cliente", e.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        >
          <option value="">{t("clients.allTypes")}</option>
          <option value="HABITUAL">{t("clients.quickHabitual")}</option>
          <option value="NO_HABITUAL">{t("clients.quickNonHabitual")}</option>
        </select>

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
          {t("clients.found", { count: list.pagination.total })}
        </div>
      )}

      {list.loading && <Loader text={t("clients.loading")} />}

      {!list.loading && <AlertMessage message={list.error} />}

      {!list.loading && !list.error && list.items.length === 0 && (
        <EmptyState
          title={t("clients.emptyTitle")}
          description={t("clients.emptyDescription")}
        />
      )}

      {!list.loading && !list.error && list.items.length > 0 && (
        <div className="space-y-1">
          <TableBase
            columns={columns}
            data={list.items}
            renderActions={(row) => (
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/clientes/${row.id_cliente}`)}
                  className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                >
                  {t("clients.detail")}
                </button>

                <button
                  onClick={() => openEdit(row)}
                  className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                >
                  {t("clients.editAction")}
                </button>
              </div>
            )}
          />
          <Pagination pagination={list.pagination} onPageChange={list.setPage} />
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editingCliente ? t("clients.edit") : t("clients.new")}
          onClose={() => setModalOpen(false)}
        >
          <ClienteForm
            initialData={editingCliente}
            loading={saving}
            onSubmit={handleSaveCliente}
            onCancel={() => setModalOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default ClientesPage;
