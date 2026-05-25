import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  changeEstadoCuadrillaRequest,
  createCuadrillaRequest,
  getCuadrillasRequest,
  updateCuadrillaRequest,
} from "../../api/cuadrillas.api";
import AlertMessage from "../../components/common/AlertMessage";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";
import Pagination from "../../components/common/Pagination";
import TableBase from "../../components/common/TableBase";
import { useI18n } from "../../context/i18n.context";
import { usePaginatedList } from "../../hooks/usePaginatedList";
import { extractApiError } from "../../lib/api";
import CuadrillaForm from "./components/CuadrillaForm";

const initialFilters = {
  busqueda: "",
  estado: "",
};

const CuadrillasPage = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const list = usePaginatedList({
    fetcher: getCuadrillasRequest,
    initialFilters,
    errorMessage: t("crews.loadError"),
  });

  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCuadrilla, setEditingCuadrilla] = useState(null);

  const handleFilter = (event) => {
    event.preventDefault();
    list.applyFilters();
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCuadrilla(null);
  };

  const handleSave = async (form) => {
    try {
      setSaving(true);
      list.setError("");

      if (editingCuadrilla) {
        await updateCuadrillaRequest(editingCuadrilla.id_cuadrilla, form);
      } else {
        await createCuadrillaRequest(form);
      }

      closeModal();
      list.reload();
    } catch (error) {
      list.setError(extractApiError(error, t("crews.saveError")));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEstado = async (cuadrilla) => {
    try {
      list.setError("");
      const nuevoEstado = cuadrilla.estado === "ACTIVA" ? "INACTIVA" : "ACTIVA";
      await changeEstadoCuadrillaRequest(cuadrilla.id_cuadrilla, { estado: nuevoEstado });
      list.reload();
    } catch (error) {
      list.setError(
          extractApiError(error, t("crews.changeStatusError"))
        );
    }
  };

  const columns = useMemo(
    () => [
      { key: "nombre", label: t("crews.crew") },
      {
        key: "descripcion",
        label: t("crews.description"),
        render: (row) => row.descripcion || "-",
      },
      {
        key: "total_empleados",
        label: t("crews.members"),
        render: (row) =>
          t("crews.totalAndActive", {
            total: row.total_empleados,
            active: row.empleados_activos,
          }),
      },
      {
        key: "estado",
        label: t("crews.status"),
        render: (row) => (
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
              row.estado === "ACTIVA"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {row.estado === "ACTIVA" ? t("crews.active") : t("crews.inactive")}
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
          <h1 className="text-2xl font-bold">{t("crews.title")}</h1>
          <p className="text-sm text-slate-500">{t("crews.subtitle")}</p>
        </div>

        <button
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
          onClick={() => {
            setEditingCuadrilla(null);
            setModalOpen(true);
          }}
        >
          {t("crews.new")}
        </button>
      </div>

      <AlertMessage message={list.error} />

      <form
        onSubmit={handleFilter}
        className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-4"
      >
        <input
          type="text"
          placeholder={t("crews.searchPlaceholder")}
          value={list.filters.busqueda}
          onChange={(event) => list.setFilter("busqueda", event.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        />

        <select
          value={list.filters.estado}
          onChange={(event) => list.setFilter("estado", event.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        >
          <option value="">{t("crews.allStatuses")}</option>
          <option value="ACTIVA">{t("crews.active")}</option>
          <option value="INACTIVA">{t("crews.inactive")}</option>
        </select>

        <button
          type="submit"
          className="rounded-xl border px-4 py-3 font-medium hover:bg-slate-50"
        >
          {t("crews.filter")}
        </button>

        <button
          type="button"
          onClick={list.resetFilters}
          className="rounded-xl border px-4 py-3 font-medium hover:bg-slate-50"
        >
          {t("crews.clear")}
        </button>
      </form>

      {list.loading && <Loader text={t("crews.loading")} />}

      {!list.loading && !list.error && list.items.length === 0 && (
        <EmptyState
          title={t("crews.emptyTitle")}
          description={t("crews.emptyDescription")}
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
                  onClick={() => navigate(`/empleados?id_cuadrilla=${row.id_cuadrilla}`)}
                  className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                >
                  {t("crews.viewTeam")}
                </button>

                <button
                  onClick={() => {
                    setEditingCuadrilla(row);
                    setModalOpen(true);
                  }}
                  className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                >
                  {t("crews.editAction")}
                </button>

                <button
                  onClick={() => handleToggleEstado(row)}
                  className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                >
                  {row.estado === "ACTIVA"
                    ? t("crews.deactivateAction")
                    : t("crews.activateAction")}
                </button>
              </div>
            )}
          />
          <Pagination pagination={list.pagination} onPageChange={list.setPage} />
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editingCuadrilla ? t("crews.editTitle") : t("crews.newTitle")}
          onClose={closeModal}
        >
          <CuadrillaForm
            initialData={editingCuadrilla}
            loading={saving}
            submitLabel={editingCuadrilla ? t("crews.updateLabel") : t("crews.saveLabel")}
            onSubmit={handleSave}
            onCancel={closeModal}
          />
        </Modal>
      )}
    </div>
  );
};

export default CuadrillasPage;
