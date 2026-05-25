import { useMemo, useState } from "react";
import {
  changeEstadoCategoriaRequest,
  createCategoriaRequest,
  getCategoriasRequest,
  updateCategoriaRequest,
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
import CategoriaForm from "./components/CategoriaForm";

const initialFilters = { estado: "" };

const CategoriasPage = () => {
  const { t } = useI18n();
  const list = usePaginatedList({
    fetcher: getCategoriasRequest,
    initialFilters,
    errorMessage: t("serviceCategories.loadError"),
  });

  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState(null);

  const handleFilter = (e) => {
    e.preventDefault();
    list.applyFilters();
  };

  const handleSaveCategoria = async (form) => {
    try {
      setSaving(true);
      list.setError("");

      if (editingCategoria) {
        await updateCategoriaRequest(editingCategoria.id_categoria_servicio, form);
      } else {
        await createCategoriaRequest(form);
      }

      setModalOpen(false);
      setEditingCategoria(null);
      list.reload();
    } catch (err) {
      list.setError(extractApiError(err, t("serviceCategories.saveError")));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEstado = async (categoria) => {
    try {
      list.setError("");
      const nuevoEstado = categoria.estado === "ACTIVA" ? "INACTIVA" : "ACTIVA";

      await changeEstadoCategoriaRequest(categoria.id_categoria_servicio, {
        estado: nuevoEstado,
      });

      list.reload();
    } catch (err) {
      list.setError(
        extractApiError(err, t("serviceCategories.changeStatusError"))
      );
    }
  };

  const columns = useMemo(
    () => [
      { key: "nombre", label: t("serviceCategories.name") },
      {
        key: "descripcion",
        label: t("serviceCategories.description"),
        render: (row) => row.descripcion || "-",
      },
      {
        key: "estado",
        label: t("serviceCategories.status"),
        render: (row) => (
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
              row.estado === "ACTIVA"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {row.estado === "ACTIVA"
              ? t("serviceCategories.active")
              : t("serviceCategories.inactive")}
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
          <h1 className="text-2xl font-bold">{t("serviceCategories.title")}</h1>
          <p className="text-sm text-slate-500">{t("serviceCategories.subtitle")}</p>
        </div>

        <button
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
          onClick={() => {
            setEditingCategoria(null);
            setModalOpen(true);
          }}
        >
          {t("serviceCategories.new")}
        </button>
      </div>

      <AlertMessage message={list.error} />

      <form
        onSubmit={handleFilter}
        className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-3"
      >
        <select
          value={list.filters.estado}
          onChange={(e) => list.setFilter("estado", e.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        >
          <option value="">{t("serviceCategories.allStatuses")}</option>
          <option value="ACTIVA">{t("serviceCategories.active")}</option>
          <option value="INACTIVA">{t("serviceCategories.inactive")}</option>
        </select>

        <button
          type="submit"
          className="rounded-xl border px-4 py-3 font-medium hover:bg-slate-50"
        >
          {t("serviceCategories.filter")}
        </button>

        <button
          type="button"
          onClick={list.resetFilters}
          className="rounded-xl border px-4 py-3 font-medium hover:bg-slate-50"
        >
          {t("serviceCategories.clear")}
        </button>
      </form>

      {list.loading && <Loader text={t("serviceCategories.loading")} />}

      {!list.loading && !list.error && list.items.length === 0 && (
        <EmptyState
          title={t("serviceCategories.emptyTitle")}
          description={t("serviceCategories.emptyDescription")}
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
                    setEditingCategoria(row);
                    setModalOpen(true);
                  }}
                  className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                >
                  {t("serviceCategories.editAction")}
                </button>

                <button
                  onClick={() => handleToggleEstado(row)}
                  className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                >
                  {row.estado === "ACTIVA"
                    ? t("serviceCategories.deactivateAction")
                    : t("serviceCategories.activateAction")}
                </button>
              </div>
            )}
          />
          <Pagination pagination={list.pagination} onPageChange={list.setPage} />
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editingCategoria ? t("serviceCategories.editTitle") : t("serviceCategories.newTitle")}
          onClose={() => {
            setModalOpen(false);
            setEditingCategoria(null);
          }}
        >
          <CategoriaForm
            initialData={editingCategoria}
            loading={saving}
            submitLabel={
              editingCategoria
                ? t("serviceCategories.updateLabel")
                : t("serviceCategories.saveLabel")
            }
            onSubmit={handleSaveCategoria}
            onCancel={() => {
              setModalOpen(false);
              setEditingCategoria(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
};

export default CategoriasPage;
