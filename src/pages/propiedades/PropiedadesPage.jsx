import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getClientesRequest } from "../../api/clientes.api";
import {
  changeEstadoPropiedadRequest,
  createPropiedadRequest,
  getPropiedadesRequest,
  updatePropiedadRequest,
} from "../../api/propiedades.api";
import AlertMessage from "../../components/common/AlertMessage";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";
import Pagination from "../../components/common/Pagination";
import TableBase from "../../components/common/TableBase";
import { useI18n } from "../../context/i18n.context";
import { usePaginatedList } from "../../hooks/usePaginatedList";
import { extractApiError } from "../../lib/api";
import PropiedadForm from "../clientes/components/PropiedadForm";

const TIPOS_PROPIEDAD = [
  "CASA",
  "RESIDENCIAL",
  "TERRENO",
  "COMERCIO",
  "BODEGA",
  "OFICINA",
  "OTRA",
];

const initialFilters = {
  busqueda: "",
  estado: "",
  tipo_propiedad: "",
};

const PropiedadesPage = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  const list = usePaginatedList({
    fetcher: getPropiedadesRequest,
    initialFilters,
    errorMessage: t("properties.loadError"),
  });

  const [clientes, setClientes] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadClientes = async () => {
      try {
        const { data } = await getClientesRequest({ estado: "ACTIVO", limit: 200 });
        setClientes(data);
      } catch (err) {
        list.setError(extractApiError(err, t("properties.clientsLoadError")));
      }
    };
    loadClientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const handleFilter = (e) => {
    e.preventDefault();
    list.applyFilters();
  };

  const openCreate = () => {
    setEditing(null);
    list.setError("");
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    list.setError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSave = async (form) => {
    try {
      setSaving(true);
      list.setError("");
      if (editing) {
        await updatePropiedadRequest(editing.id_propiedad, form);
      } else {
        await createPropiedadRequest(form);
      }
      closeModal();
      list.reload();
    } catch (err) {
      list.setError(extractApiError(err, t("properties.saveError")));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEstado = async (row) => {
    const nuevoEstado = row.estado === "ACTIVA" ? "INACTIVA" : "ACTIVA";
    try {
      list.setError("");
      await changeEstadoPropiedadRequest(row.id_propiedad, { estado: nuevoEstado });
      list.reload();
    } catch (err) {
      list.setError(extractApiError(err, t("properties.changeStatusError")));
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "nombre_propiedad",
        label: t("properties.property"),
        render: (row) => (
          <div>
            <p className="font-medium">{row.nombre_propiedad}</p>
            {row.referencia && <p className="text-xs text-slate-500">{row.referencia}</p>}
          </div>
        ),
      },
      { key: "tipo_propiedad", label: t("properties.type") },
      {
        key: "cliente",
        label: t("properties.client"),
        render: (row) => (
          <div>
            <p className="font-medium">{row.nombre_completo || t("properties.noAddress")}</p>
            {row.nombre_empresa && <p className="text-xs text-slate-500">{row.nombre_empresa}</p>}
          </div>
        ),
      },
      {
        key: "direccion",
        label: t("properties.address"),
        render: (row) => row.direccion || t("properties.noAddress"),
      },
      {
        key: "estado",
        label: t("properties.status"),
        render: (row) => (
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
              row.estado === "ACTIVA"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {row.estado === "ACTIVA" ? t("properties.active") : t("properties.inactive")}
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
          <h1 className="text-2xl font-bold">{t("properties.title")}</h1>
          <p className="text-sm text-slate-500">{t("properties.subtitle")}</p>
        </div>

        <button
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
          onClick={openCreate}
        >
          {t("properties.new")}
        </button>
      </div>

      <form
        onSubmit={handleFilter}
        className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-4"
      >
        <input
          type="text"
          placeholder={t("properties.searchPlaceholder")}
          value={list.filters.busqueda}
          onChange={(e) => list.setFilter("busqueda", e.target.value)}
          className="rounded-xl border px-4 py-3 outline-none md:col-span-2"
        />

        <select
          value={list.filters.estado}
          onChange={(e) => list.setFilter("estado", e.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        >
          <option value="">{t("properties.allStatuses")}</option>
          <option value="ACTIVA">{t("properties.active")}</option>
          <option value="INACTIVA">{t("properties.inactive")}</option>
        </select>

        <select
          value={list.filters.tipo_propiedad}
          onChange={(e) => list.setFilter("tipo_propiedad", e.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        >
          <option value="">{t("properties.allTypes")}</option>
          {TIPOS_PROPIEDAD.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="rounded-xl border px-4 py-3 font-medium hover:bg-slate-50 md:col-span-4"
        >
          {t("properties.filter")}
        </button>
      </form>

      {list.loading && <Loader text={t("properties.loading")} />}

      {!list.loading && <AlertMessage message={list.error} />}

      {!list.loading && !list.error && list.items.length === 0 && (
        <EmptyState
          title={t("properties.emptyTitle")}
          description={t("properties.emptyDescription")}
        />
      )}

      {!list.loading && !list.error && list.items.length > 0 && (
        <div className="space-y-1">
          <TableBase
            columns={columns}
            data={list.items}
            renderActions={(row) => (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => navigate(`/clientes/${row.id_cliente}`)}
                  className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                >
                  {t("properties.viewClient")}
                </button>

                <button
                  onClick={() => openEdit(row)}
                  className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                >
                  {t("properties.editAction")}
                </button>

                <button
                  onClick={() => handleToggleEstado(row)}
                  className={`rounded-lg border px-3 py-1.5 text-xs ${
                    row.estado === "ACTIVA"
                      ? "text-red-600 hover:bg-red-50"
                      : "text-green-700 hover:bg-green-50"
                  }`}
                >
                  {row.estado === "ACTIVA" ? t("properties.deactivate") : t("properties.activate")}
                </button>
              </div>
            )}
          />
          <Pagination pagination={list.pagination} onPageChange={list.setPage} />
        </div>
      )}

      {modalOpen && (
        <Modal title={editing ? t("properties.edit") : t("properties.new")} onClose={closeModal}>
          <PropiedadForm
            initialData={editing}
            clientes={clientes}
            loading={saving}
            onSubmit={handleSave}
            onCancel={closeModal}
          />
        </Modal>
      )}
    </div>
  );
};

export default PropiedadesPage;
