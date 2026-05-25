import { useState } from "react";
import AlertMessage from "../../../components/common/AlertMessage";
import { useI18n } from "../../../context/i18n.context";

const buildState = (initialData) => ({
  nombre: initialData?.nombre || "",
  descripcion: initialData?.descripcion || "",
});

const CuadrillaForm = ({
  initialData = null,
  onSubmit,
  onCancel,
  loading = false,
  submitLabel,
}) => {
  const { t } = useI18n();
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
      setError(t("crews.form.requiredName"));
      return;
    }

    onSubmit({
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AlertMessage message={error} />

      <input
        type="text"
        name="nombre"
        value={form.nombre}
        onChange={handleChange}
        placeholder={t("crews.form.namePlaceholder")}
        className="w-full rounded-xl border px-4 py-3"
      />

      <textarea
        name="descripcion"
        value={form.descripcion}
        onChange={handleChange}
        rows={3}
        placeholder={t("crews.form.descriptionPlaceholder")}
        className="w-full rounded-xl border px-4 py-3"
      />

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-xl border px-4 py-2">
          {t("crews.form.cancel")}
        </button>

        <button disabled={loading} className="rounded-xl bg-slate-900 px-4 py-2 text-white">
          {loading ? t("crews.form.saving") : submitLabel || t("crews.saveLabel")}
        </button>
      </div>
    </form>
  );
};

export default CuadrillaForm;
