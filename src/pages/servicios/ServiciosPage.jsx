import { useEffect, useMemo, useState } from "react";
import {
  changeEstadoServicioRequest,
  createServicioRequest,
  getCategoriasRequest,
  getServiciosRequest,
  updateServicioRequest,
} from "../../api/servicios.api";
import AlertMessage from "../../components/common/AlertMessage";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";
import Pagination from "../../components/common/Pagination";
import TableBase from "../../components/common/TableBase";
import { useI18n } from "../../context/i18n.context";
import { usePaginatedList } from "../../hooks/usePaginatedList";
import { extractApiError } from "../../lib/api";
import { formatCurrency } from "../../utils/currency";
import ServicioForm from "./components/ServicioForm";

const initialFilters = {
  busqueda: "",
  estado: "",
  id_categoria_servicio: "",
};

const ServiciosPage = () => {
  const { t } = useI18n();
  const list = usePaginatedList({
    fetcher: getServiciosRequest,
    initialFilters,
    errorMessage: t("serviceCatalog.loadError"),
  });

  const [categorias, setCategorias] = useState([]);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingServicio, setEditingServicio] = useState(null);

  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const { data } = await getCategoriasRequest({ estado: "ACTIVA", limit: 200 });
        setCategorias(data);
      } catch (err) {
        list.setError(extractApiError(err, t("serviceCatalog.categoriesLoadError")));
      }
    };
    loadCategorias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    list.applyFilters();
  };

  const handleSaveServicio = async (form) => {
    try {
      setSaving(true);
      list.setError("");

      if (editingServicio) {
        await updateServicioRequest(editingServicio.id_servicio, form);
      } else {
        await createServicioRequest(form);
      }

      setModalOpen(false);
      setEditingServicio(null);
      list.reload();
    } catch (err) {
      list.setError(extractApiError(err, t("serviceCatalog.saveError")));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEstado = async (servicio) => {
    try {
      list.setError("");
      const nuevoEstado = servicio.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";

      await changeEstadoServicioRequest(servicio.id_servicio, {
        estado: nuevoEstado,
      });

      list.reload();
    } catch (err) {
      list.setError(extractApiError(err, t("serviceCatalog.changeStatusError")));
    }
  };

  const columns = useMemo(
    () => [
      { key: "categoria", label: t("serviceCatalog.category") },
      { key: "nombre", label: t("serviceCatalog.service") },
      {
        key: "descripcion",
        label: t("serviceCatalog.description"),
        render: (row) => row.descripcion || "-",
      },
      {
        key: "duracion_estimada_min",
        label: t("serviceCatalog.duration"),
        render: (row) => `${row.duracion_estimada_min} min`,
      },
      {
        key: "precio_base",
        label: t("serviceCatalog.basePrice"),
        render: (row) =>
          row.precio_base !== null && row.precio_base !== undefined
            ? formatCurrency(row.precio_base)
            : t("serviceCatalog.noPrice"),
      },
      {
        key: "estado",
        label: t("serviceCategories.status"),
        render: (row) => (
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
              row.estado === "ACTIVO"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {row.estado === "ACTIVO"
              ? t("serviceCatalog.active")
              : t("serviceCatalog.inactive")}
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
          <h1 className="text-2xl font-bold">{t("serviceCatalog.title")}</h1>
          <p className="text-sm text-slate-500">{t("serviceCatalog.subtitle")}</p>
        </div>

        <button
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
          onClick={() => {
            setEditingServicio(null);
            setModalOpen(true);
          }}
        >
          {t("serviceCatalog.new")}
        </button>
      </div>

      <AlertMessage message={list.error} />

      <form
        onSubmit={handleFilter}
        className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-4"
      >
        <input
          type="text"
          placeholder={t("serviceCatalog.searchPlaceholder")}
          value={list.filters.busqueda}
          onChange={(e) => list.setFilter("busqueda", e.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        />

        <select
          value={list.filters.estado}
          onChange={(e) => list.setFilter("estado", e.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        >
          <option value="">{t("serviceCatalog.allStatuses")}</option>
          <option value="ACTIVO">{t("serviceCatalog.active")}</option>
          <option value="INACTIVO">{t("serviceCatalog.inactive")}</option>
        </select>

        <select
          value={list.filters.id_categoria_servicio}
          onChange={(e) =>
            list.setFilter("id_categoria_servicio", e.target.value)
          }
          className="rounded-xl border px-4 py-3 outline-none"
        >
          <option value="">{t("serviceCatalog.allCategories")}</option>
          {categorias.map((categoria) => (
            <option
              key={categoria.id_categoria_servicio}
              value={categoria.id_categoria_servicio}
            >
              {categoria.nombre}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="rounded-xl border px-4 py-3 font-medium hover:bg-slate-50"
        >
          {t("serviceCatalog.filter")}
        </button>
      </form>

      {list.loading && <Loader text={t("serviceCatalog.loading")} />}

      {!list.loading && !list.error && list.items.length === 0 && (
        <EmptyState
          title={t("serviceCatalog.emptyTitle")}
          description={t("serviceCatalog.emptyDescription")}
        />
      )}

      {!list.loading && list.items.length > 0 && (
        <div className="space-y-1">
          <TableBase
            columns={columns}
            data={list.items}
            renderActions={(row) => (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingServicio(row);
                    setModalOpen(true);
                  }}
                  className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                >
                  {t("serviceCatalog.editAction")}
                </button>

                <button
                  onClick={() => handleToggleEstado(row)}
                  className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                >
                  {row.estado === "ACTIVO"
                    ? t("serviceCatalog.deactivateAction")
                    : t("serviceCatalog.activateAction")}
                </button>
              </div>
            )}
          />
          <Pagination pagination={list.pagination} onPageChange={list.setPage} />
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editingServicio ? t("serviceCatalog.editTitle") : t("serviceCatalog.newTitle")}
          onClose={() => {
            setModalOpen(false);
            setEditingServicio(null);
          }}
        >
          <ServicioForm
            categorias={categorias}
            initialData={editingServicio}
            loading={saving}
            submitLabel={
              editingServicio ? t("serviceCatalog.updateLabel") : t("serviceCatalog.saveLabel")
            }
            onSubmit={handleSaveServicio}
            onCancel={() => {
              setModalOpen(false);
              setEditingServicio(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
};

export default ServiciosPage;
