import { useMemo, useState } from "react";
import {
  changeEstadoEmpleadoRequest,
  createEmpleadoRequest,
  getEmpleadosRequest,
  updateEmpleadoRequest,
} from "../../api/empleados.api";
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
import EmpleadoForm from "./components/EmpleadoForm";

const EmpleadosPage = () => {
  const { t } = useI18n();
  const initialFilters = useMemo(
    () => ({
      busqueda: "",
      estado: "",
    }),
    []
  );

  const list = usePaginatedList({
    fetcher: getEmpleadosRequest,
    initialFilters,
    errorMessage: t("employees.loadError"),
  });

  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmpleado, setEditingEmpleado] = useState(null);

  const handleFilter = (event) => {
    event.preventDefault();
    list.applyFilters();
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingEmpleado(null);
  };

  const handleSave = async (form) => {
    try {
      setSaving(true);
      list.setError("");

      if (editingEmpleado) {
        await updateEmpleadoRequest(editingEmpleado.id_empleado, form);
      } else {
        await createEmpleadoRequest(form);
      }

      closeModal();
      list.reload();
    } catch (error) {
      list.setError(extractApiError(error, t("employees.saveError")));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEstado = async (empleado) => {
    try {
      list.setError("");
      const nuevoEstado = empleado.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
      await changeEstadoEmpleadoRequest(empleado.id_empleado, { estado: nuevoEstado });
      list.reload();
    } catch (error) {
      list.setError(extractApiError(error, t("employees.changeStatusError")));
    }
  };

  const columns = useMemo(
    () => [
      { key: "nombre_completo", label: t("employees.employee") },
      {
        key: "puesto",
        label: t("employees.role"),
        render: (row) => row.puesto || "-",
      },
      {
        key: "especialidad",
        label: t("employees.specialty"),
        render: (row) => row.especialidad || "-",
      },
      {
        key: "telefono",
        label: t("employees.phone"),
        render: (row) => row.telefono || "-",
      },
      {
        key: "correo",
        label: t("employees.email"),
        render: (row) => row.correo || "-",
      },
      {
        key: "horas_trabajo_dia",
        label: t("employees.hoursPerDay"),
        render: (row) => row.horas_trabajo_dia ?? "-",
      },
      {
        key: "pago_diario",
        label: t("employees.dailyPay"),
        render: (row) => (row.pago_diario == null ? "-" : formatCurrency(row.pago_diario)),
      },
      {
        key: "pago_semanal_estimado",
        label: t("employees.weeklyPay"),
        render: (row) =>
          row.pago_semanal_estimado == null ? "-" : formatCurrency(row.pago_semanal_estimado),
      },
      {
        key: "estado",
        label: "Estado",
        render: (row) => (
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
              row.estado === "ACTIVO"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {row.estado === "ACTIVO" ? t("employees.active") : t("employees.inactive")}
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
          <h1 className="text-2xl font-bold">{t("employees.title")}</h1>
          <p className="text-sm text-slate-500">{t("employees.subtitle")}</p>
        </div>

        <button
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
          onClick={() => {
            setEditingEmpleado(null);
            setModalOpen(true);
          }}
        >
          {t("employees.new")}
        </button>
      </div>

      <AlertMessage message={list.error} />

      <form
        onSubmit={handleFilter}
        className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-4"
      >
        <input
          type="text"
          placeholder={t("employees.searchPlaceholder")}
          value={list.filters.busqueda}
          onChange={(event) => list.setFilter("busqueda", event.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        />

        <select
          value={list.filters.estado}
          onChange={(event) => list.setFilter("estado", event.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        >
          <option value="">{t("employees.allStatuses")}</option>
          <option value="ACTIVO">{t("employees.active")}</option>
          <option value="INACTIVO">{t("employees.inactive")}</option>
        </select>

        <button
          type="submit"
          className="rounded-xl border px-4 py-3 font-medium hover:bg-slate-50"
        >
          {t("employees.filter")}
        </button>

        <button
          type="button"
          onClick={list.resetFilters}
          className="rounded-xl border px-4 py-3 font-medium hover:bg-slate-50"
        >
          {t("employees.clear")}
        </button>
      </form>

      {list.loading && <Loader text={t("employees.loading")} />}

      {!list.loading && !list.error && list.items.length === 0 && (
        <EmptyState
          title={t("employees.emptyTitle")}
          description={t("employees.emptyDescription")}
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
                    setEditingEmpleado(row);
                    setModalOpen(true);
                  }}
                  className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                >
                  {t("employees.editAction")}
                </button>

                <button
                  onClick={() => handleToggleEstado(row)}
                  className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                >
                  {row.estado === "ACTIVO"
                    ? t("employees.deactivateAction")
                    : t("employees.activateAction")}
                </button>
              </div>
            )}
          />
          <Pagination pagination={list.pagination} onPageChange={list.setPage} />
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editingEmpleado ? t("employees.editTitle") : t("employees.newTitle")}
          onClose={closeModal}
        >
          <EmpleadoForm
            initialData={editingEmpleado}
            loading={saving}
            submitLabel={editingEmpleado ? t("employees.updateLabel") : t("employees.saveLabel")}
            onSubmit={handleSave}
            onCancel={closeModal}
          />
        </Modal>
      )}
    </div>
  );
};

export default EmpleadosPage;
