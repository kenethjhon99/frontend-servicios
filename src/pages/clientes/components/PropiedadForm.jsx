import { useState } from "react";
import AlertMessage from "../../../components/common/AlertMessage";
import { useI18n } from "../../../context/i18n.context";

const TIPOS_PROPIEDAD = [
  "CASA",
  "RESIDENCIAL",
  "TERRENO",
  "COMERCIO",
  "BODEGA",
  "OFICINA",
  "OTRA",
];

const buildInitialForm = (initialData, idCliente) => ({
  id_cliente: initialData?.id_cliente ?? idCliente ?? "",
  nombre_propiedad: initialData?.nombre_propiedad ?? "",
  tipo_propiedad: initialData?.tipo_propiedad ?? "CASA",
  direccion: initialData?.direccion ?? "",
  referencia: initialData?.referencia ?? "",
  ubicacion_maps: initialData?.ubicacion_maps ?? "",
  latitud: initialData?.latitud ?? "",
  longitud: initialData?.longitud ?? "",
  link_maps: initialData?.link_maps ?? "",
  tamano_aproximado_m2: initialData?.tamano_aproximado_m2 ?? "",
  notas_acceso: initialData?.notas_acceso ?? "",
  contacto_recibe: initialData?.contacto_recibe ?? "",
  telefono_contacto_recibe: initialData?.telefono_contacto_recibe ?? "",
});

const PropiedadForm = ({
  idCliente,
  initialData,
  clientes,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const { t } = useI18n();
  const isEdit = Boolean(initialData);
  const showClienteSelector = !idCliente && !isEdit && Array.isArray(clientes);

  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(() => buildInitialForm(initialData, idCliente));
  const [lastKey, setLastKey] = useState({ initialData, idCliente });

  if (initialData !== lastKey.initialData || idCliente !== lastKey.idCliente) {
    setLastKey({ initialData, idCliente });
    setForm(buildInitialForm(initialData, idCliente));
    setFormError("");
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormError("");
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.id_cliente) {
      setFormError(t("properties.form.requiredClient"));
      return;
    }

    if (!form.nombre_propiedad.trim()) {
      setFormError(t("properties.form.requiredName"));
      return;
    }

    if (!form.direccion.trim()) {
      setFormError(t("properties.form.requiredAddress"));
      return;
    }

    onSubmit({
      ...form,
      id_cliente: Number(form.id_cliente),
      latitud: form.latitud === "" ? null : Number(form.latitud),
      longitud: form.longitud === "" ? null : Number(form.longitud),
      tamano_aproximado_m2:
        form.tamano_aproximado_m2 === "" ? null : Number(form.tamano_aproximado_m2),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AlertMessage message={formError} />

      {showClienteSelector && (
        <select
          name="id_cliente"
          value={form.id_cliente}
          onChange={handleChange}
          className="w-full rounded-xl border px-4 py-3"
        >
          <option value="">{t("properties.form.selectClient")}</option>
          {clientes.map((c) => (
            <option key={c.id_cliente} value={c.id_cliente}>
              {c.nombre_completo}
              {c.nombre_empresa ? ` - ${c.nombre_empresa}` : ""}
            </option>
          ))}
        </select>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <input
          name="nombre_propiedad"
          value={form.nombre_propiedad}
          onChange={handleChange}
          placeholder={t("properties.form.namePlaceholder")}
          className="rounded-xl border px-4 py-3"
        />

        <select
          name="tipo_propiedad"
          value={form.tipo_propiedad}
          onChange={handleChange}
          className="rounded-xl border px-4 py-3"
        >
          {TIPOS_PROPIEDAD.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>

        <input
          name="direccion"
          value={form.direccion}
          onChange={handleChange}
          placeholder={t("properties.form.addressPlaceholder")}
          className="rounded-xl border px-4 py-3 md:col-span-2"
        />

        <input
          name="referencia"
          value={form.referencia}
          onChange={handleChange}
          placeholder={t("properties.form.referencePlaceholder")}
          className="rounded-xl border px-4 py-3 md:col-span-2"
        />

        <input
          name="latitud"
          value={form.latitud}
          onChange={handleChange}
          placeholder={t("properties.form.latitudePlaceholder")}
          className="rounded-xl border px-4 py-3"
        />
        <input
          name="longitud"
          value={form.longitud}
          onChange={handleChange}
          placeholder={t("properties.form.longitudePlaceholder")}
          className="rounded-xl border px-4 py-3"
        />

        <input
          name="link_maps"
          value={form.link_maps}
          onChange={handleChange}
          placeholder={t("properties.form.mapsPlaceholder")}
          className="rounded-xl border px-4 py-3 md:col-span-2"
        />

        <input
          name="tamano_aproximado_m2"
          value={form.tamano_aproximado_m2}
          onChange={handleChange}
          placeholder={t("properties.form.sizePlaceholder")}
          className="rounded-xl border px-4 py-3"
        />

        <input
          name="contacto_recibe"
          value={form.contacto_recibe}
          onChange={handleChange}
          placeholder={t("properties.form.receiverPlaceholder")}
          className="rounded-xl border px-4 py-3"
        />

        <input
          name="telefono_contacto_recibe"
          value={form.telefono_contacto_recibe}
          onChange={handleChange}
          placeholder={t("properties.form.receiverPhonePlaceholder")}
          className="rounded-xl border px-4 py-3"
        />
      </div>

      <textarea
        name="notas_acceso"
        value={form.notas_acceso}
        onChange={handleChange}
        placeholder={t("properties.form.accessNotesPlaceholder")}
        rows={2}
        className="w-full rounded-xl border px-4 py-3"
      />

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-xl border px-4 py-2">
          {t("properties.form.cancel")}
        </button>

        <button disabled={loading} className="rounded-xl bg-slate-900 px-4 py-2 text-white">
          {loading
            ? t("properties.form.saving")
            : isEdit
            ? t("properties.form.update")
            : t("properties.form.save")}
        </button>
      </div>
    </form>
  );
};

export default PropiedadForm;
