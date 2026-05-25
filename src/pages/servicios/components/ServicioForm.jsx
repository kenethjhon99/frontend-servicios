import { useState } from "react";
import AlertMessage from "../../../components/common/AlertMessage";
import { useI18n } from "../../../context/i18n.context";

const emptyState = {
  id_categoria_servicio: "",
  nombre: "",
  descripcion: "",
  duracion_estimada_min: "",
  precio_base: "",
  requiere_materiales: false,
  permite_recurrencia: true,
};

const buildState = (initialData) => {
  if (!initialData) return emptyState;
  return {
    id_categoria_servicio: initialData.id_categoria_servicio
      ? String(initialData.id_categoria_servicio)
      : "",
    nombre: initialData.nombre || "",
    descripcion: initialData.descripcion || "",
    duracion_estimada_min: initialData.duracion_estimada_min
      ? String(initialData.duracion_estimada_min)
      : "",
    precio_base: initialData.precio_base ?? "",
    requiere_materiales: Boolean(initialData.requiere_materiales),
    permite_recurrencia:
      initialData.permite_recurrencia === undefined
        ? true
        : Boolean(initialData.permite_recurrencia),
  };
};

const ServicioForm = ({
  categorias = [],
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
    const { name, value, type, checked } = event.target;
    setFormError("");
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.id_categoria_servicio) {
      setFormError(t("serviceCatalog.form.requiredCategory"));
      return;
    }

    if (!form.nombre.trim()) {
      setFormError(t("serviceCatalog.form.requiredName"));
      return;
    }

    if (!form.duracion_estimada_min || Number(form.duracion_estimada_min) <= 0) {
      setFormError(t("serviceCatalog.form.invalidDuration"));
      return;
    }

    if (form.precio_base !== "" && Number(form.precio_base) < 0) {
      setFormError(t("serviceCatalog.form.invalidBasePrice"));
      return;
    }

    onSubmit({
      id_categoria_servicio: Number(form.id_categoria_servicio),
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      duracion_estimada_min: Number(form.duracion_estimada_min),
      precio_base: form.precio_base === "" ? null : Number(form.precio_base),
      requiere_materiales: form.requiere_materiales,
      permite_recurrencia: form.permite_recurrencia,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AlertMessage message={formError} />

      <div className="grid gap-3 md:grid-cols-2">
        <select
          name="id_categoria_servicio"
          value={form.id_categoria_servicio}
          onChange={handleChange}
          className="rounded-xl border px-4 py-3"
        >
          <option value="">{t("serviceCatalog.form.categoryPlaceholder")}</option>
          {categorias.map((categoria) => (
            <option
              key={categoria.id_categoria_servicio}
              value={categoria.id_categoria_servicio}
            >
              {categoria.nombre}
            </option>
          ))}
        </select>

        <input
          name="nombre"
          value={form.nombre}
          onChange={handleChange}
          placeholder={t("serviceCatalog.form.namePlaceholder")}
          className="rounded-xl border px-4 py-3"
        />

        <input
          type="number"
          name="duracion_estimada_min"
          value={form.duracion_estimada_min}
          onChange={handleChange}
          placeholder={t("serviceCatalog.form.durationPlaceholder")}
          className="rounded-xl border px-4 py-3"
        />

        <input
          type="number"
          name="precio_base"
          value={form.precio_base}
          onChange={handleChange}
          placeholder={t("serviceCatalog.form.basePricePlaceholder")}
          className="rounded-xl border px-4 py-3"
        />
      </div>

      <textarea
        name="descripcion"
        value={form.descripcion}
        onChange={handleChange}
        placeholder={t("serviceCatalog.form.descriptionPlaceholder")}
        rows={3}
        className="w-full rounded-xl border px-4 py-3"
      />

      <label className="flex items-center gap-2 rounded-xl border px-4 py-3">
        <input
          type="checkbox"
          name="requiere_materiales"
          checked={form.requiere_materiales}
          onChange={handleChange}
        />
        <span className="text-sm text-slate-700">{t("serviceCatalog.form.materialsToggle")}</span>
      </label>

      <label className="flex items-center gap-2 rounded-xl border px-4 py-3">
        <input
          type="checkbox"
          name="permite_recurrencia"
          checked={form.permite_recurrencia}
          onChange={handleChange}
        />
        <span className="text-sm text-slate-700">
          {t("serviceCatalog.form.recurrenceToggle")}
        </span>
      </label>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-xl border px-4 py-2">
          {t("serviceCatalog.form.cancel")}
        </button>

        <button disabled={loading} className="rounded-xl bg-slate-900 px-4 py-2 text-white">
          {loading ? t("serviceCatalog.form.saving") : submitLabel || t("serviceCatalog.saveLabel")}
        </button>
      </div>
    </form>
  );
};

export default ServicioForm;
