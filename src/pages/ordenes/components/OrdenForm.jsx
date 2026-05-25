import { useEffect, useState } from "react";
import { getClientesRequest, getPropiedadesByClienteRequest } from "../../../api/clientes.api";
import { getEmpleadosRequest } from "../../../api/empleados.api";
import { getServiciosRequest } from "../../../api/servicios.api";
import AlertMessage from "../../../components/common/AlertMessage";
import FormProgress from "../../../components/common/FormProgress";
import { useAuth } from "../../../context/auth.context";
import { useI18n } from "../../../context/i18n.context";
import { useFormDraft } from "../../../hooks/useFormDraft";
import { extractApiError } from "../../../lib/api";
import { formatCurrency } from "../../../utils/currency";

const emptyDetalle = {
  id_servicio: "",
  descripcion_servicio: "",
  cantidad: 1,
  precio_unitario: "",
  descripcion_precio: "",
  requiere_materiales: false,
  tipo_material: "",
  precio_material_extra: "",
  duracion_estimada_min: "",
  estado: "PENDIENTE",
  observaciones: "",
};

const formatEmpleadoOption = (empleado, fecha, t) => {
  if (!fecha) {
    return empleado.nombre_completo;
  }

  if (empleado.disponible_fecha) {
    return `${empleado.nombre_completo} - ${t("orders.form.available")}`;
  }

  return `${empleado.nombre_completo} - ${t("orders.form.busy", {
    orders: empleado.ordenes_fecha_count || 0,
    schedules: empleado.programaciones_fecha_count || 0,
  })}`;
};

const OrdenForm = ({ onSubmit, onCancel, loading = false }) => {
  const auth = useAuth();
  const { t } = useI18n();
  const draftScope =
    auth?.user?.id_usuario ||
    auth?.user?.username ||
    auth?.user?.correo ||
    auth?.user?.nombre ||
    "guest";
  const [clientes, setClientes] = useState([]);
  const [propiedades, setPropiedades] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    id_cliente: "",
    id_propiedad: "",
    id_empleados: [],
    fecha_servicio: "",
    tipo_visita: "PROGRAMADA",
    origen: "MANUAL",
    hora_inicio_programada: "",
    descuento: 0,
    costo_estimado: "",
    observaciones_previas: "",
    detalles: [{ ...emptyDetalle }],
  });
  const draft = useFormDraft({
    storageKey: "orden-form-new",
    userScope: draftScope,
    values: { form, step },
  });

  useEffect(() => {
    const loadBase = async () => {
      try {
        setLoadError("");
        const [clientesRes, serviciosRes] = await Promise.all([
          getClientesRequest({ estado: "ACTIVO", limit: 200 }),
          getServiciosRequest({ estado: "ACTIVO", limit: 200 }),
        ]);

        setClientes(clientesRes.data);
        setServicios(serviciosRes.data);
      } catch (error) {
        setLoadError(extractApiError(error, t("orders.form.loadBaseError")));
      }
    };

    loadBase();
  }, [t]);

  useEffect(() => {
    const loadPropiedades = async () => {
      if (!form.id_cliente) {
        setPropiedades([]);
        return;
      }

      try {
        setLoadError("");
        const data = await getPropiedadesByClienteRequest(form.id_cliente);
        setPropiedades(data.filter((propiedad) => propiedad.estado === "ACTIVA"));
      } catch (error) {
        setLoadError(extractApiError(error, t("orders.form.propertiesLoadError")));
      }
    };

    loadPropiedades();
  }, [form.id_cliente, t]);

  useEffect(() => {
    const loadEmpleados = async () => {
      try {
        setLoadError("");
        const { data } = await getEmpleadosRequest({
          estado: "ACTIVO",
          limit: 200,
          ...(form.fecha_servicio ? { fecha: form.fecha_servicio } : {}),
        });
        setEmpleados(data);
      } catch (error) {
        setLoadError(extractApiError(error, t("orders.form.employeesLoadError")));
      }
    };

    loadEmpleados();
  }, [form.fecha_servicio, t]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormError("");
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "id_cliente" ? { id_propiedad: "" } : {}),
    }));
  };

  const handleEmpleadosChange = (e) => {
    const selected = Array.from(e.target.selectedOptions, (option) => option.value);
    setFormError("");
    setForm((prev) => ({
      ...prev,
      id_empleados: selected,
    }));
  };

  const handleDetalleChange = (index, name, value) => {
    setFormError("");
    setForm((prev) => {
      const detalles = [...prev.detalles];
      detalles[index] = {
        ...detalles[index],
        [name]: name === "requiere_materiales" ? Boolean(value) : value,
        ...(name === "requiere_materiales" && !value
          ? { tipo_material: "", precio_material_extra: "" }
          : {}),
      };

      return { ...prev, detalles };
    });
  };

  const addDetalle = () => {
    setForm((prev) => ({
      ...prev,
      detalles: [...prev.detalles, { ...emptyDetalle }],
    }));
  };

  const removeDetalle = (index) => {
    setFormError("");
    setForm((prev) => ({
      ...prev,
      detalles: prev.detalles.filter((_, detalleIndex) => detalleIndex !== index),
    }));
  };

  const subtotal = form.detalles.reduce((acc, item) => {
    return (
      acc +
      Number(item.cantidad || 0) * Number(item.precio_unitario || 0) +
      Number(item.precio_material_extra || 0)
    );
  }, 0);

  const total = Math.max(0, subtotal - Number(form.descuento || 0));

  const progressSteps = [
    {
      label: t("orders.form.steps.client"),
      hint: t("orders.form.steps.clientHint"),
      complete: Boolean(form.id_cliente && form.id_propiedad),
    },
    {
      label: t("orders.form.steps.schedule"),
      hint: t("orders.form.steps.scheduleHint"),
      complete: Boolean(form.fecha_servicio && form.tipo_visita && form.id_empleados.length),
    },
    {
      label: t("orders.form.steps.services"),
      hint: t("orders.form.steps.servicesHint"),
      complete: form.detalles.some((item) => item.id_servicio && Number(item.precio_unitario) > 0),
    },
    {
      label: t("orders.form.steps.review"),
      hint: t("orders.form.steps.reviewHint"),
      complete: total > 0,
    },
  ];

  const validateStep = (stepIndex) => {
    if (stepIndex === 0 && (!form.id_cliente || !form.id_propiedad)) {
      setFormError(t("orders.form.requireClientProperty"));
      return false;
    }

    if (stepIndex === 1 && !form.fecha_servicio) {
      setFormError(t("orders.form.requireServiceDate"));
      return false;
    }

    if (stepIndex === 2) {
      const detalleInvalido = form.detalles.some((item) => {
        return (
          !item.id_servicio ||
          !item.precio_unitario ||
          Number(item.cantidad) <= 0 ||
          (item.requiere_materiales &&
            (!item.tipo_material || Number(item.precio_material_extra || 0) < 0))
        );
      });

      if (detalleInvalido) {
        setFormError(t("orders.form.invalidServices"));
        return false;
      }
    }

    return true;
  };

  const goToStep = (nextStep) => {
    if (nextStep > step && !validateStep(step)) {
      return;
    }
    setFormError("");
    setStep(nextStep);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.id_cliente || !form.id_propiedad || !form.fecha_servicio) {
      setFormError(t("orders.form.submitMissingBase"));
      return;
    }

    if (!form.detalles.length) {
      setFormError(t("orders.form.submitMissingDetails"));
      return;
    }

    const detalleInvalido = form.detalles.some((item) => {
      return (
        !item.id_servicio ||
        !item.precio_unitario ||
        Number(item.cantidad) <= 0 ||
        (item.requiere_materiales &&
          (!item.tipo_material || Number(item.precio_material_extra || 0) < 0))
      );
    });

    if (detalleInvalido) {
      setFormError(t("orders.form.submitInvalidDetails"));
      return;
    }

    await Promise.resolve(
      onSubmit({
        id_cliente: Number(form.id_cliente),
        id_propiedad: Number(form.id_propiedad),
        id_empleados: form.id_empleados.map((id) => Number(id)),
        fecha_servicio: form.fecha_servicio,
        tipo_visita: form.tipo_visita,
        origen: form.origen,
        hora_inicio_programada: form.hora_inicio_programada || null,
        descuento: Number(form.descuento || 0),
        costo_estimado: form.costo_estimado ? Number(form.costo_estimado) : null,
        observaciones_previas: form.observaciones_previas || null,
        detalles: form.detalles.map((item) => ({
          id_servicio: Number(item.id_servicio),
          id_programacion: null,
          descripcion_servicio: item.descripcion_servicio || null,
          cantidad: Number(item.cantidad),
          precio_unitario: Number(item.precio_unitario),
          descripcion_precio: item.descripcion_precio || null,
          requiere_materiales: Boolean(item.requiere_materiales),
          tipo_material: item.requiere_materiales ? item.tipo_material || null : null,
          precio_material_extra: item.requiere_materiales
            ? Number(item.precio_material_extra || 0)
            : 0,
          duracion_estimada_min: item.duracion_estimada_min
            ? Number(item.duracion_estimada_min)
            : null,
          estado: item.estado,
          observaciones: item.observaciones || null,
        })),
      })
    );
    draft.clearDraft();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-24">
      <AlertMessage message={loadError || formError} />

      {draft.hasDraft && (
        <div className="surface-card rounded-[1.25rem] bg-sky-50/80 px-4 py-3 text-sm text-slate-700">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-slate-900">{t("orders.form.draftTitle")}</p>
              <p className="text-xs text-slate-500">
                {t("orders.form.draftSaved", { value: draft.lastSavedLabel || "..." })}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  draft.restoreDraft((snapshot) => {
                    setForm(snapshot.form);
                    setStep(snapshot.step || 0);
                  })
                }
                className="rounded-xl border px-3 py-2 text-xs font-semibold"
              >
                {t("orders.form.restore")}
              </button>
              <button
                type="button"
                onClick={draft.clearDraft}
                className="rounded-xl border px-3 py-2 text-xs font-semibold text-red-600"
              >
                {t("orders.form.discard")}
              </button>
            </div>
          </div>
        </div>
      )}

      <FormProgress
        title={t("orders.form.title")}
        description={t("orders.form.description")}
        steps={progressSteps}
        activeIndex={step}
        onStepChange={goToStep}
      />

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-5">
          {step === 0 && (
            <section className="surface-card rounded-[1.75rem] bg-white p-5">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  {t("orders.form.clientLocationTitle")}
                </h3>
                <p className="text-sm text-slate-500">
                  {t("orders.form.clientLocationDescription")}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <select
                  name="id_cliente"
                  value={form.id_cliente}
                  onChange={handleChange}
                  className="rounded-xl border px-4 py-3"
                >
                  <option value="">{t("orders.form.selectClient")}</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id_cliente} value={cliente.id_cliente}>
                      {cliente.nombre_completo}
                    </option>
                  ))}
                </select>

                <select
                  name="id_propiedad"
                  value={form.id_propiedad}
                  onChange={handleChange}
                  disabled={!form.id_cliente}
                  className="rounded-xl border px-4 py-3"
                >
                  <option value="">{t("orders.form.selectProperty")}</option>
                  {propiedades.map((propiedad) => (
                    <option key={propiedad.id_propiedad} value={propiedad.id_propiedad}>
                      {propiedad.nombre_propiedad}
                    </option>
                  ))}
                </select>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="surface-card rounded-[1.75rem] bg-white p-5">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  {t("orders.form.scheduleTitle")}
                </h3>
                <p className="text-sm text-slate-500">{t("orders.form.scheduleDescription")}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <select
                  multiple
                  aria-label={t("orders.form.assignedEmployees")}
                  value={form.id_empleados}
                  onChange={handleEmpleadosChange}
                  className="min-h-36 rounded-xl border px-4 py-3 md:col-span-2"
                >
                  {empleados.map((empleado) => (
                    <option
                      key={empleado.id_empleado}
                      value={empleado.id_empleado}
                      disabled={Boolean(form.fecha_servicio && empleado.disponible_fecha === false)}
                    >
                      {formatEmpleadoOption(empleado, form.fecha_servicio, t)}
                    </option>
                  ))}
                </select>

                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 text-sm text-slate-500 md:col-span-2">
                  {t("orders.form.multiSelectHelp")}
                </div>

                <input
                  type="date"
                  name="fecha_servicio"
                  value={form.fecha_servicio}
                  onChange={handleChange}
                  className="rounded-xl border px-4 py-3"
                />

                <input
                  type="time"
                  name="hora_inicio_programada"
                  value={form.hora_inicio_programada}
                  onChange={handleChange}
                  className="rounded-xl border px-4 py-3"
                />

                <select
                  name="tipo_visita"
                  value={form.tipo_visita}
                  onChange={handleChange}
                  className="rounded-xl border px-4 py-3"
                >
                  <option value="PROGRAMADA">PROGRAMADA</option>
                  <option value="EXTRA">EXTRA</option>
                  <option value="URGENTE">URGENTE</option>
                </select>

                <select
                  name="origen"
                  value={form.origen}
                  onChange={handleChange}
                  className="rounded-xl border px-4 py-3"
                >
                  <option value="MANUAL">MANUAL</option>
                  <option value="PROGRAMACION">PROGRAMACION</option>
                  <option value="COTIZACION">COTIZACION</option>
                </select>
              </div>

              <textarea
                name="observaciones_previas"
                value={form.observaciones_previas}
                onChange={handleChange}
                placeholder={t("orders.form.priorNotesPlaceholder")}
                rows={2}
                className="mt-3 w-full rounded-xl border px-4 py-3"
              />
            </section>
          )}

          {step === 2 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {t("orders.form.servicesTitle")}
                  </h3>
                  <p className="text-sm text-slate-500">{t("orders.form.servicesDescription")}</p>
                </div>

                <button
                  type="button"
                  onClick={addDetalle}
                  className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50"
                >
                  {t("orders.form.addService")}
                </button>
              </div>

              {form.detalles.map((item, index) => (
                <div key={index} className="surface-card rounded-[1.5rem] bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-medium">
                      {t("orders.form.serviceNumber", { value: index + 1 })}
                    </h4>

                    {form.detalles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDetalle(index)}
                        className="rounded-lg border px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        {t("orders.form.remove")}
                      </button>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <select
                      value={item.id_servicio}
                      onChange={(e) => handleDetalleChange(index, "id_servicio", e.target.value)}
                      className="rounded-xl border bg-white px-4 py-3"
                    >
                      <option value="">{t("orders.form.selectService")}</option>
                      {servicios.map((servicio) => (
                        <option key={servicio.id_servicio} value={servicio.id_servicio}>
                          {servicio.nombre}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      value={item.cantidad}
                      onChange={(e) => handleDetalleChange(index, "cantidad", e.target.value)}
                      placeholder={t("orders.form.quantityPlaceholder")}
                      className="rounded-xl border bg-white px-4 py-3"
                    />

                    <input
                      type="number"
                      value={item.precio_unitario}
                      onChange={(e) => handleDetalleChange(index, "precio_unitario", e.target.value)}
                      placeholder={t("orders.form.unitPricePlaceholder")}
                      className="rounded-xl border bg-white px-4 py-3"
                    />

                    <input
                      type="number"
                      value={item.duracion_estimada_min}
                      onChange={(e) =>
                        handleDetalleChange(index, "duracion_estimada_min", e.target.value)
                      }
                      placeholder={t("orders.form.durationPlaceholder")}
                      className="rounded-xl border bg-white px-4 py-3"
                    />

                    <input
                      value={item.descripcion_servicio}
                      onChange={(e) =>
                        handleDetalleChange(index, "descripcion_servicio", e.target.value)
                      }
                      placeholder={t("orders.form.serviceDescriptionPlaceholder")}
                      className="rounded-xl border bg-white px-4 py-3 md:col-span-2"
                    />

                    <input
                      value={item.descripcion_precio}
                      onChange={(e) =>
                        handleDetalleChange(index, "descripcion_precio", e.target.value)
                      }
                      placeholder={t("orders.form.priceDescriptionPlaceholder")}
                      className="rounded-xl border bg-white px-4 py-3 md:col-span-2"
                    />

                    <label className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3 md:col-span-2">
                      <input
                        type="checkbox"
                        checked={Boolean(item.requiere_materiales)}
                        onChange={(e) =>
                          handleDetalleChange(index, "requiere_materiales", e.target.checked)
                        }
                      />
                      <span className="text-sm text-slate-700">{t("orders.form.materialsToggle")}</span>
                    </label>

                    {item.requiere_materiales && (
                      <>
                        <input
                          value={item.tipo_material}
                          onChange={(e) =>
                            handleDetalleChange(index, "tipo_material", e.target.value)
                          }
                          placeholder={t("orders.form.materialTypePlaceholder")}
                          className="rounded-xl border bg-white px-4 py-3"
                        />

                        <input
                          type="number"
                          value={item.precio_material_extra}
                          onChange={(e) =>
                            handleDetalleChange(index, "precio_material_extra", e.target.value)
                          }
                          placeholder={t("orders.form.materialExtraPlaceholder")}
                          className="rounded-xl border bg-white px-4 py-3"
                        />
                      </>
                    )}

                    <textarea
                      value={item.observaciones}
                      onChange={(e) => handleDetalleChange(index, "observaciones", e.target.value)}
                      placeholder={t("orders.form.observationsPlaceholder")}
                      rows={2}
                      className="rounded-xl border bg-white px-4 py-3 md:col-span-2"
                    />

                    <div className="rounded-xl bg-slate-900 px-4 py-3 text-sm text-white md:col-span-2">
                      <strong>
                        {t("orders.form.serviceSubtotal", {
                          value: formatCurrency(
                            Number(item.cantidad || 0) * Number(item.precio_unitario || 0) +
                              Number(item.precio_material_extra || 0)
                          ),
                        })}
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}

          {step === 3 && (
            <section className="surface-card rounded-[1.75rem] bg-white p-5">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  {t("orders.form.finalReviewTitle")}
                </h3>
                <p className="text-sm text-slate-500">
                  {t("orders.form.finalReviewDescription")}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="number"
                  name="descuento"
                  value={form.descuento}
                  onChange={handleChange}
                  placeholder={t("orders.form.discountPlaceholder")}
                  className="rounded-xl border px-4 py-3"
                />

                <input
                  type="number"
                  name="costo_estimado"
                  value={form.costo_estimado}
                  onChange={handleChange}
                  placeholder={t("orders.form.estimatedCostPlaceholder")}
                  className="rounded-xl border px-4 py-3"
                />
              </div>

              <div className="mt-4 rounded-[1.25rem] border border-slate-200/70 bg-slate-50/80 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">{t("orders.form.saveSummary")}</p>
                <ul className="mt-3 space-y-2">
                  <li>
                    {t("orders.form.reviewClient", {
                      value:
                        clientes.find((item) => String(item.id_cliente) === form.id_cliente)
                          ?.nombre_completo || "-",
                    })}
                  </li>
                  <li>
                    {t("orders.form.reviewProperty", {
                      value:
                        propiedades.find((item) => String(item.id_propiedad) === form.id_propiedad)
                          ?.nombre_propiedad || "-",
                    })}
                  </li>
                  <li>{t("orders.form.reviewDate", { value: form.fecha_servicio || "-" })}</li>
                  <li>{t("orders.form.reviewEmployees", { value: form.id_empleados.length || 0 })}</li>
                  <li>{t("orders.form.reviewServices", { value: form.detalles.length })}</li>
                </ul>
              </div>
            </section>
          )}
        </div>

        <aside className="xl:sticky xl:top-28 xl:self-start">
          <div className="surface-card rounded-[1.75rem] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              {t("orders.form.sidebarTitle")}
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">
              {t("orders.form.sidebarTotalsTitle")}
            </h3>
            <p className="mt-2 text-sm text-slate-500">{t("orders.form.sidebarDescription")}</p>

            <div className="mt-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span>{t("orders.form.subtotal")}</span>
                <strong>{formatCurrency(subtotal)}</strong>
              </div>

              <div className="flex justify-between text-sm">
                <span>{t("orders.form.discount")}</span>
                <strong>{formatCurrency(form.descuento || 0)}</strong>
              </div>

              <div className="flex justify-between rounded-2xl bg-slate-900 px-4 py-4 text-lg text-white">
                <span>{t("orders.form.total")}</span>
                <strong>{formatCurrency(total)}</strong>
              </div>
            </div>

            <div className="mt-5 rounded-[1.25rem] border border-slate-200/70 bg-slate-50/80 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">{t("orders.form.checklistTitle")}</p>
              <ul className="mt-3 space-y-2">
                <li>{t("orders.form.checklistLine1")}</li>
                <li>{t("orders.form.checklistLine2")}</li>
                <li>{t("orders.form.checklistLine3")}</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>

      <div className="surface-card sticky bottom-3 z-10 rounded-[1.5rem] bg-white/90 p-3 backdrop-blur md:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {t("orders.form.stepOf", { current: step + 1, total: progressSteps.length })}
            </p>
            <p className="text-xs text-slate-500">
              {progressSteps[step].hint}
              {draft.lastSavedLabel
                ? ` ${t("orders.form.savedDraft", { value: draft.lastSavedLabel })}`
                : ""}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="rounded-xl border px-4 py-2">
              {t("orders.form.cancel")}
            </button>
            {step > 0 && (
              <button
                type="button"
                onClick={() => goToStep(step - 1)}
                className="rounded-xl border px-4 py-2"
              >
                {t("orders.form.previous")}
              </button>
            )}
            {step < progressSteps.length - 1 ? (
              <button
                type="button"
                onClick={() => goToStep(step + 1)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-white"
              >
                {t("orders.form.next")}
              </button>
            ) : (
              <button disabled={loading} className="rounded-xl bg-slate-900 px-4 py-2 text-white">
                {loading ? t("orders.form.saving") : t("orders.form.create")}
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
};

export default OrdenForm;
