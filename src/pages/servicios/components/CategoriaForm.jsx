import { useState } from "react";
import AlertMessage from "../../../components/common/AlertMessage";
import { useI18n } from "../../../context/i18n.context";

const emptyState = {
  nombre: "",
  descripcion: "",
};

const buildState = (initialData) => {
  if (!initialData) return emptyState;
  return {
    nombre: initialData.nombre || "",
    descripcion: initialData.descripcion || "",
  };
};

const CategoriaForm = ({
  initialData = null,
  onSubmit,
  onCancel,
  loading = false,
  submitLabel,
}) => {
  const { t } = useI18n();
  const [form, setForm] = useState(() => buildState(initialData));
  const [formError, setFormError] = useState("");
  const [lastInitialData, setLastInitialData] = useState(initialData);

  if (initialData !== lastInitialData) {
    setLastInitialData(initialData);
    setForm(buildState(initialData));
    setFormError("");
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormError("");
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.nombre.trim()) {
      setFormError(t("serviceCategories.form.requiredName"));
      return;
    }

    onSubmit({
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AlertMessage message={formError} />

      <input
        name="nombre"
        value={form.nombre}
        onChange={handleChange}
        placeholder={t("serviceCategories.form.namePlaceholder")}
        className="w-full rounded-xl border px-4 py-3"
      />

      <textarea
        name="descripcion"
        value={form.descripcion}
        onChange={handleChange}
        placeholder={t("serviceCategories.form.descriptionPlaceholder")}
        rows={3}
        className="w-full rounded-xl border px-4 py-3"
      />

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-xl border px-4 py-2">
          {t("serviceCategories.form.cancel")}
        </button>

        <button disabled={loading} className="rounded-xl bg-slate-900 px-4 py-2 text-white">
          {loading
            ? t("serviceCategories.form.saving")
            : submitLabel || t("serviceCategories.saveLabel")}
        </button>
      </div>
    </form>
  );
};

export default CategoriaForm;
