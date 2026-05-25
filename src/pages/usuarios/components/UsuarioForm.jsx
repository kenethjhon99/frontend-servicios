import { useState } from "react";
import AlertMessage from "../../../components/common/AlertMessage";
import { useI18n } from "../../../context/i18n.context";

const ROLES = ["ADMIN", "SUPERVISOR", "OPERADOR", "COBRADOR"];

const buildState = (initialData) => ({
  nombre: initialData?.nombre || "",
  correo: initialData?.correo || "",
  telefono: initialData?.telefono || "",
  username: initialData?.username || "",
  rol: initialData?.rol || "OPERADOR",
  password: "",
  confirmar_password: "",
});

const UsuarioForm = ({
  initialData = null,
  onSubmit,
  onCancel,
  loading = false,
  submitLabel,
}) => {
  const { t } = useI18n();
  const isEditing = Boolean(initialData);
  const [form, setForm] = useState(() => buildState(initialData));
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setError("");
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.nombre.trim()) {
      setError(t("users.form.requiredName"));
      return;
    }

    if (!form.username.trim()) {
      setError(t("users.form.requiredUsername"));
      return;
    }

    if (!isEditing) {
      if (!form.password) {
        setError(t("users.form.requiredPassword"));
        return;
      }

      if (form.password !== form.confirmar_password) {
        setError(t("users.form.passwordMismatch"));
        return;
      }
    }

    onSubmit({
      nombre: form.nombre.trim(),
      correo: form.correo.trim() || null,
      telefono: form.telefono.trim() || null,
      username: form.username.trim(),
      rol: form.rol,
      ...(!isEditing ? { password: form.password } : {}),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AlertMessage message={error} />

      <div className="grid gap-3 md:grid-cols-2">
        <input
          type="text"
          name="nombre"
          value={form.nombre}
          onChange={handleChange}
          placeholder={t("users.form.namePlaceholder")}
          className="rounded-xl border px-4 py-3"
        />

        <input
          type="text"
          name="username"
          value={form.username}
          onChange={handleChange}
          placeholder={t("users.form.usernamePlaceholder")}
          className="rounded-xl border px-4 py-3"
        />

        <input
          type="email"
          name="correo"
          value={form.correo}
          onChange={handleChange}
          placeholder={t("users.form.emailPlaceholder")}
          className="rounded-xl border px-4 py-3"
        />

        <input
          type="text"
          name="telefono"
          value={form.telefono}
          onChange={handleChange}
          placeholder={t("users.form.phonePlaceholder")}
          className="rounded-xl border px-4 py-3"
        />

        <select
          name="rol"
          value={form.rol}
          onChange={handleChange}
          className="rounded-xl border px-4 py-3 md:col-span-2"
        >
          {ROLES.map((rol) => (
            <option key={rol} value={rol}>
              {t(`users.roles.${rol}`)}
            </option>
          ))}
        </select>

        {!isEditing && (
          <>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder={t("users.form.passwordPlaceholder")}
              className="rounded-xl border px-4 py-3"
            />

            <input
              type="password"
              name="confirmar_password"
              value={form.confirmar_password}
              onChange={handleChange}
              placeholder={t("users.form.confirmPasswordPlaceholder")}
              className="rounded-xl border px-4 py-3"
            />
          </>
        )}
      </div>

      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <p className="font-medium text-slate-900">{t("users.form.securityTitle")}</p>
        <p className="mt-1">{t("users.form.securityDescription")}</p>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-xl border px-4 py-2">
          {t("users.form.cancel")}
        </button>

        <button disabled={loading} className="rounded-xl bg-slate-900 px-4 py-2 text-white">
          {loading ? t("users.form.saving") : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default UsuarioForm;
