import { useMemo, useState } from "react";
import {
  changeEstadoUsuarioRequest,
  createUsuarioRequest,
  getUsuariosRequest,
  resetPasswordUsuarioRequest,
  updateUsuarioRequest,
} from "../../api/usuarios.api";
import AlertMessage from "../../components/common/AlertMessage";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";
import Pagination from "../../components/common/Pagination";
import TableBase from "../../components/common/TableBase";
import { useAuth } from "../../context/auth.context";
import { useI18n } from "../../context/i18n.context";
import { useToast } from "../../context/toast.context";
import { usePaginatedList } from "../../hooks/usePaginatedList";
import { extractApiError } from "../../lib/api";
import ResetPasswordForm from "./components/ResetPasswordForm";
import UsuarioForm from "./components/UsuarioForm";

const initialFilters = {
  busqueda: "",
  estado: "",
  rol: "",
};

const ROLES = ["ADMIN", "SUPERVISOR", "OPERADOR", "COBRADOR"];

const UsuariosPage = () => {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const toast = useToast();

  const list = usePaginatedList({
    fetcher: getUsuariosRequest,
    initialFilters,
    errorMessage: t("users.loadError"),
  });

  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);

  const closeUserModal = () => {
    setModalOpen(false);
    setEditingUsuario(null);
  };

  const handleFilter = (event) => {
    event.preventDefault();
    list.applyFilters();
  };

  const handleSave = async (form) => {
    try {
      setSaving(true);
      list.setError("");

      if (editingUsuario) {
        await updateUsuarioRequest(editingUsuario.id_usuario, form);
        toast.success(t("users.updated"));
      } else {
        await createUsuarioRequest(form);
        toast.success(t("users.created"));
      }

      closeUserModal();
      list.reload();
    } catch (error) {
      const message = extractApiError(error, t("users.saveError"));
      list.setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEstado = async (usuario) => {
    try {
      list.setError("");
      const nuevoEstado = usuario.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
      await changeEstadoUsuarioRequest(usuario.id_usuario, { estado: nuevoEstado });
      toast.success(
        t(
          nuevoEstado === "ACTIVO" ? "users.activatedSuccess" : "users.deactivatedSuccess",
          { username: usuario.username }
        )
      );
      list.reload();
    } catch (error) {
      const message = extractApiError(error, t("users.changeStatusError"));
      list.setError(message);
      toast.error(message);
    }
  };

  const handleResetPassword = async (payload) => {
    try {
      setSaving(true);
      list.setError("");
      const response = await resetPasswordUsuarioRequest(resetTarget.id_usuario, payload);
      toast.success(response?.mensaje || t("users.resetSuccess"));
      setResetTarget(null);
    } catch (error) {
      const message = extractApiError(error, t("users.resetError"));
      list.setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "nombre",
        label: t("users.name"),
        render: (row) => (
          <div>
            <p className="font-medium">{row.nombre}</p>
            {row.correo && <p className="text-xs text-slate-500">{row.correo}</p>}
          </div>
        ),
      },
      { key: "username", label: t("users.username") },
      {
        key: "telefono",
        label: t("users.phone"),
        render: (row) => row.telefono || "-",
      },
      {
        key: "rol",
        label: t("users.role"),
        render: (row) => t(`users.roles.${row.rol}`),
      },
      {
        key: "estado",
        label: t("users.status"),
        render: (row) => (
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
              row.estado === "ACTIVO"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {row.estado === "ACTIVO" ? t("users.active") : t("users.inactive")}
          </span>
        ),
      },
      {
        key: "updated_at",
        label: t("users.updatedAt"),
        render: (row) =>
          new Date(row.updated_at).toLocaleString(locale === "en" ? "en-US" : "es-GT", {
            dateStyle: "short",
            timeStyle: "short",
          }),
      },
    ],
    [locale, t]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("users.title")}</h1>
          <p className="text-sm text-slate-500">{t("users.subtitle")}</p>
        </div>

        <button
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
          onClick={() => {
            setEditingUsuario(null);
            setModalOpen(true);
          }}
        >
          {t("users.new")}
        </button>
      </div>

      <AlertMessage message={list.error} />

      <form
        onSubmit={handleFilter}
        className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-4"
      >
        <input
          type="text"
          placeholder={t("users.searchPlaceholder")}
          value={list.filters.busqueda}
          onChange={(event) => list.setFilter("busqueda", event.target.value)}
          className="rounded-xl border px-4 py-3 outline-none md:col-span-2"
        />

        <select
          value={list.filters.estado}
          onChange={(event) => list.setFilter("estado", event.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        >
          <option value="">{t("users.allStatuses")}</option>
          <option value="ACTIVO">{t("users.active")}</option>
          <option value="INACTIVO">{t("users.inactive")}</option>
        </select>

        <select
          value={list.filters.rol}
          onChange={(event) => list.setFilter("rol", event.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        >
          <option value="">{t("users.allRoles")}</option>
          {ROLES.map((rol) => (
            <option key={rol} value={rol}>
              {t(`users.roles.${rol}`)}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="rounded-xl border px-4 py-3 font-medium hover:bg-slate-50 md:col-span-2"
        >
          {t("users.filter")}
        </button>

        <button
          type="button"
          onClick={list.resetFilters}
          className="rounded-xl border px-4 py-3 font-medium hover:bg-slate-50 md:col-span-2"
        >
          {t("users.clear")}
        </button>
      </form>

      {list.loading && <Loader text={t("users.loading")} />}

      {!list.loading && !list.error && list.items.length === 0 && (
        <EmptyState title={t("users.emptyTitle")} description={t("users.emptyDescription")} />
      )}

      {!list.loading && list.items.length > 0 && (
        <div className="space-y-1">
          <TableBase
            columns={columns}
            data={list.items}
            renderActions={(row) => {
              const isSelf = Number(user?.id_usuario) === Number(row.id_usuario);
              return (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setEditingUsuario(row);
                      setModalOpen(true);
                    }}
                    className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                  >
                    {t("users.editAction")}
                  </button>

                  <button
                    onClick={() => setResetTarget(row)}
                    className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                  >
                    {t("users.resetAction")}
                  </button>

                  <button
                    onClick={() => handleToggleEstado(row)}
                    disabled={isSelf && row.estado === "ACTIVO"}
                    className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {row.estado === "ACTIVO"
                      ? t("users.deactivateAction")
                      : t("users.activateAction")}
                  </button>
                </div>
              );
            }}
          />
          <Pagination pagination={list.pagination} onPageChange={list.setPage} />
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editingUsuario ? t("users.editTitle") : t("users.newTitle")}
          onClose={closeUserModal}
        >
          <UsuarioForm
            initialData={editingUsuario}
            loading={saving}
            submitLabel={editingUsuario ? t("users.updateLabel") : t("users.saveLabel")}
            onSubmit={handleSave}
            onCancel={closeUserModal}
          />
        </Modal>
      )}

      {resetTarget && (
        <Modal
          title={t("users.resetModalTitle", { username: resetTarget.username })}
          onClose={() => setResetTarget(null)}
        >
          <ResetPasswordForm
            loading={saving}
            submitLabel={t("users.resetSubmit")}
            onSubmit={handleResetPassword}
            onCancel={() => setResetTarget(null)}
          />
        </Modal>
      )}
    </div>
  );
};

export default UsuariosPage;
