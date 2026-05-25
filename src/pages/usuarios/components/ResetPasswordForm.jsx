import { useState } from "react";
import AlertMessage from "../../../components/common/AlertMessage";
import { useI18n } from "../../../context/i18n.context";

const ResetPasswordForm = ({
  onSubmit,
  onCancel,
  loading = false,
  submitLabel,
}) => {
  const { t } = useI18n();
  const [form, setForm] = useState({
    password_nueva: "",
    confirmar_password: "",
  });
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setError("");
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.password_nueva) {
      setError(t("users.reset.requiredPassword"));
      return;
    }

    if (form.password_nueva !== form.confirmar_password) {
      setError(t("users.reset.passwordMismatch"));
      return;
    }

    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AlertMessage message={error} />

      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <p className="font-medium text-slate-900">{t("users.reset.title")}</p>
        <p className="mt-1">{t("users.reset.description")}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <input
          type="password"
          name="password_nueva"
          value={form.password_nueva}
          onChange={handleChange}
          placeholder={t("users.reset.passwordPlaceholder")}
          className="rounded-xl border px-4 py-3"
        />

        <input
          type="password"
          name="confirmar_password"
          value={form.confirmar_password}
          onChange={handleChange}
          placeholder={t("users.reset.confirmPasswordPlaceholder")}
          className="rounded-xl border px-4 py-3"
        />
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

export default ResetPasswordForm;
