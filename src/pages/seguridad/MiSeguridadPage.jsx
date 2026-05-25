import { useState } from "react";
import { changeMyPasswordRequest } from "../../api/usuarios.api";
import AlertMessage from "../../components/common/AlertMessage";
import { useI18n } from "../../context/i18n.context";
import { useToast } from "../../context/toast.context";
import { extractApiError } from "../../lib/api";

const initialForm = {
  password_actual: "",
  password_nueva: "",
  confirmar_password: "",
};

const MiSeguridadPage = () => {
  const { t } = useI18n();
  const toast = useToast();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setError("");
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.password_actual) {
      setError(t("security.requiredCurrentPassword"));
      return;
    }

    if (!form.password_nueva) {
      setError(t("security.requiredNewPassword"));
      return;
    }

    if (form.password_nueva !== form.confirmar_password) {
      setError(t("security.passwordMismatch"));
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await changeMyPasswordRequest(form);
      setForm(initialForm);
      toast.success(response?.mensaje || t("security.success"));
    } catch (err) {
      const message = extractApiError(err, t("security.error"));
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("security.title")}</h1>
        <p className="text-sm text-slate-500">{t("security.subtitle")}</p>
      </div>

      <div className="surface-card max-w-3xl rounded-[1.75rem] bg-white p-6">
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <p className="font-medium text-slate-900">{t("security.cardTitle")}</p>
          <p className="mt-1">{t("security.cardDescription")}</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <AlertMessage message={error} />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-600">
                {t("security.currentPassword")}
              </span>
              <input
                type="password"
                name="password_actual"
                value={form.password_actual}
                onChange={handleChange}
                className="w-full rounded-xl border px-4 py-3"
                placeholder={t("security.currentPasswordPlaceholder")}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-600">
                {t("security.newPassword")}
              </span>
              <input
                type="password"
                name="password_nueva"
                value={form.password_nueva}
                onChange={handleChange}
                className="w-full rounded-xl border px-4 py-3"
                placeholder={t("security.newPasswordPlaceholder")}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-600">
                {t("security.confirmPassword")}
              </span>
              <input
                type="password"
                name="confirmar_password"
                value={form.confirmar_password}
                onChange={handleChange}
                className="w-full rounded-xl border px-4 py-3"
                placeholder={t("security.confirmPasswordPlaceholder")}
              />
            </label>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            <p className="font-medium text-slate-900">{t("security.policyTitle")}</p>
            <ul className="mt-2 space-y-1">
              <li>{t("security.policyLine1")}</li>
              <li>{t("security.policyLine2")}</li>
              <li>{t("security.policyLine3")}</li>
            </ul>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-slate-900 px-4 py-2 text-white"
            >
              {loading ? t("security.saving") : t("security.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MiSeguridadPage;
