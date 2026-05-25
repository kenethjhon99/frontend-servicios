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

const emptyState = {
  id_cliente: "",
  id_propiedad: "",
  id_servicio: "",
  id_empleado_responsable: "",
  frecuencia: "SEMANAL",
  fecha_inicio: "",
  hora_programada: "",
  proxima_fecha: "",
  duracion_estimada_min: "",
  precio_acordado: "",
  descripcion_precio: "",
  prioridad: "MEDIA",
  observaciones: "",
};

const formatEmpleadoOption = (empleado, fecha, t) => {
  if (!fecha) {
    return empleado.nombre_completo;
  }

  if (empleado.disponible_fecha) {
    return `${empleado.nombre_completo} - ${t("schedules.form.available")}`;
  }

  return `${empleado.nombre_completo} - ${t("schedules.form.busy", {
    orders: empleado.ordenes_fecha_count || 0,
    schedules: empleado.programaciones_fecha_count || 0,
  })}`;
};

const buildState = (initialData) => {
  if (!initialData) return emptyState;
  return {
    id_cliente: initialData.id_cliente ? String(initialData.id_cliente) : "",
    id_propiedad: initialData.id_propiedad ? String(initialData.id_propiedad) : "",
    id_servicio: initialData.id_servicio ? String(initialData.id_servicio) : "",
    id_empleado_responsable: initialData.id_empleado_responsable
      ? String(initialData.id_empleado_responsable)
      : "",
    frecuencia: initialData.frecuencia || "SEMANAL",
    fecha_inicio: initialData.fecha_inicio || "",
    hora_programada: initialData.hora_programada || "",
    proxima_fecha: initialData.proxima_fecha || "",
    duracion_estimada_min: initialData.duracion_estimada_min
      ? String(initialData.duracion_estimada_min)
      : "",
    precio_acordado: initialData.precio_acordado ? String(initialData.precio_acordado) : "",
    descripcion_precio: initialData.descripcion_precio || "",
    prioridad: initialData.prioridad || "MEDIA",
    observaciones: initialData.observaciones || "",
  };
};

const ProgramacionForm = ({
  initialData = null,
  onSubmit,
  onCancel,
  loading = false,
  submitLabel,
}) => {
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
  const [form, setForm] = useState(() => buildState(initialData));
  const [lastInitialData, setLastInitialData] = useState(initialData);
  const [step, setStep] = useState(0);
  const draft = useFormDraft({
    storageKey: `programacion-form-${initialData?.id_programacion || "new"}`,
    userScope: draftScope,
    values: { form, step },
  });

  if (initialData !== lastInitialData) {
    setLastInitialData(initialData);
    setForm(buildState(initialData));
    setFormError("");
    setStep(0);
  }

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
        setLoadError(extractApiError(error, t("schedules.form.loadBaseError")));
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
        setLoadError(extractApiError(error, t("schedules.form.propertiesLoadError")));
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
          ...(form.proxima_fecha ? { fecha: form.proxima_fecha } : {}),
          ...(initialData?.id_programacion
            ? { exclude_id_programacion: initialData.id_programacion }
            : {}),
        });
        setEmpleados(data);
      } catch (error) {
        setLoadError(extractApiError(error, t("schedules.form.employeesLoadError")));
      }
    };

    loadEmpleados();
  }, [form.proxima_fecha, initialData?.id_programacion, t]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormError("");
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "id_cliente" ? { id_propiedad: "" } : {}),
    }));
  };

  const progressSteps = [
    {
      label: t("schedules.form.steps.client"),
      hint: t("schedules.form.steps.clientHint"),
      complete: Boolean(form.id_cliente && form.id_propiedad),
    },
    {
      label: t("schedules.form.steps.service"),
      hint: t("schedules.form.steps.serviceHint"),
      complete: Boolean(form.id_servicio && form.prioridad),
    },
    {
      label: t("schedules.form.steps.agenda"),
      hint: t("schedules.form.steps.agendaHint"),
      complete: Boolean(form.frecuencia && form.fecha_inicio && form.proxima_fecha),
    },
    {
      label: t("schedules.form.steps.price"),
      hint: t("schedules.form.steps.priceHint"),
      complete: Boolean(form.precio_acordado !== "" && form.id_empleado_responsable),
    },
  ];

  const validateStep = (stepIndex) => {
    if (stepIndex === 0 && (!form.id_cliente || !form.id_propiedad)) {
      setFormError(t("schedules.form.requireClientProperty"));
      return false;
    }

    if (stepIndex === 1 && !form.id_servicio) {
      setFormError(t("schedules.form.requireService"));
      return false;
    }

    if (stepIndex === 2) {
      if (!form.fecha_inicio || !form.proxima_fecha) {
        setFormError(t("schedules.form.requireDates"));
        return false;
      }

      if (!form.duracion_estimada_min || Number(form.duracion_estimada_min) <= 0) {
        setFormError(t("schedules.form.requireDuration"));
        return false;
      }
    }

    if (stepIndex === 3) {
      if (form.precio_acordado === "" || Number(form.precio_acordado) < 0) {
        setFormError(t("schedules.form.requirePrice"));
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

    if (!form.id_cliente || !form.id_propiedad || !form.id_servicio) {
      setFormError(t("schedules.form.submitMissingBase"));
      return;
    }

    if (!form.fecha_inicio || !form.proxima_fecha) {
      setFormError(t("schedules.form.requireDates"));
      return;
    }

    if (!form.duracion_estimada_min || Number(form.duracion_estimada_min) <= 0) {
      setFormError(t("schedules.form.requireDuration"));
      return;
    }

    if (form.precio_acordado === "" || Number(form.precio_acordado) < 0) {
      setFormError(t("schedules.form.requirePrice"));
      return;
    }

    await Promise.resolve(
      onSubmit({
        id_cliente: Number(form.id_cliente),
        id_propiedad: Number(form.id_propiedad),
        id_servicio: Number(form.id_servicio),
        id_empleado_responsable: form.id_empleado_responsable
          ? Number(form.id_empleado_responsable)
          : null,
        frecuencia: form.frecuencia,
        fecha_inicio: form.fecha_inicio,
        hora_programada: form.hora_programada || null,
        proxima_fecha: form.proxima_fecha,
        duracion_estimada_min: Number(form.duracion_estimada_min),
        precio_acordado: Number(form.precio_acordado),
        descripcion_precio: form.descripcion_precio || null,
        prioridad: form.prioridad,
        observaciones: form.observaciones || null,
        motivo_cancelacion: initialData?.motivo_cancelacion || null,
      })
    );
    draft.clearDraft();
  };

  const responsableSeleccionado =
    empleados.find((empleado) => String(empleado.id_empleado) === form.id_empleado_responsable)
      ?.nombre_completo || t("schedules.form.unassigned");

  const finalSubmitLabel = submitLabel || t("schedules.form.save");

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-24">
      <AlertMessage message={loadError || formError} />

      {draft.hasDraft && (
        <div className="surface-card rounded-[1.25rem] bg-sky-50/80 px-4 py-3 text-sm text-slate-700">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-slate-900">{t("schedules.form.draftTitle")}</p>
              <p className="text-xs text-slate-500">
                {t("schedules.form.draftSaved", { value: draft.lastSavedLabel || "..." })}
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
                {t("schedules.form.restore")}
              </button>
              <button
                type="button"
                onClick={draft.clearDraft}
                className="rounded-xl border px-3 py-2 text-xs font-semibold text-red-600"
              >
                {t("schedules.form.discard")}
              </button>
            </div>
          </div>
        </div>
      )}

      <FormProgress
        title={initialData ? t("schedules.form.titleEdit") : t("schedules.form.titleNew")}
        description={t("schedules.form.description")}
        steps={progressSteps}
        activeIndex={step}
        onStepChange={goToStep}
      />

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          {step === 0 && (
            <section className="surface-card rounded-[1.75rem] bg-white p-5">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  {t("schedules.form.clientPropertyTitle")}
                </h3>
                <p className="text-sm text-slate-500">
                  {t("schedules.form.clientPropertyDescription")}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <select
                  name="id_cliente"
                  value={form.id_cliente}
                  onChange={handleChange}
                  className="rounded-xl border px-4 py-3"
                >
                  <option value="">{t("schedules.form.selectClient")}</option>
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
                  className="rounded-xl border px-4 py-3"
                  disabled={!form.id_cliente}
                >
                  <option value="">{t("schedules.form.selectProperty")}</option>
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
                  {t("schedules.form.serviceTitle")}
                </h3>
                <p className="text-sm text-slate-500">{t("schedules.form.serviceDescription")}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <select
                  name="id_servicio"
                  value={form.id_servicio}
                  onChange={handleChange}
                  className="rounded-xl border px-4 py-3"
                >
                  <option value="">{t("schedules.form.selectService")}</option>
                  {servicios.map((servicio) => (
                    <option key={servicio.id_servicio} value={servicio.id_servicio}>
                      {servicio.nombre}
                    </option>
                  ))}
                </select>

                <select
                  name="prioridad"
                  value={form.prioridad}
                  onChange={handleChange}
                  className="rounded-xl border px-4 py-3"
                >
                  <option value="BAJA">BAJA</option>
                  <option value="MEDIA">MEDIA</option>
                  <option value="ALTA">ALTA</option>
                  <option value="URGENTE">URGENTE</option>
                </select>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="surface-card rounded-[1.75rem] bg-white p-5">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  {t("schedules.form.agendaTitle")}
                </h3>
                <p className="text-sm text-slate-500">{t("schedules.form.agendaDescription")}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <select
                  name="frecuencia"
                  value={form.frecuencia}
                  onChange={handleChange}
                  className="rounded-xl border px-4 py-3"
                >
                  <option value="UNICA">UNICA</option>
                  <option value="SEMANAL">SEMANAL</option>
                  <option value="QUINCENAL">QUINCENAL</option>
                  <option value="MENSUAL">MENSUAL</option>
                </select>

                <input
                  type="date"
                  name="fecha_inicio"
                  value={form.fecha_inicio}
                  onChange={handleChange}
                  className="rounded-xl border px-4 py-3"
                />

                <input
                  type="date"
                  name="proxima_fecha"
                  value={form.proxima_fecha}
                  onChange={handleChange}
                  className="rounded-xl border px-4 py-3"
                />

                <input
                  type="time"
                  name="hora_programada"
                  value={form.hora_programada}
                  onChange={handleChange}
                  className="rounded-xl border px-4 py-3"
                />

                <input
                  type="number"
                  name="duracion_estimada_min"
                  value={form.duracion_estimada_min}
                  onChange={handleChange}
                  placeholder={t("schedules.form.durationPlaceholder")}
                  className="rounded-xl border px-4 py-3 md:col-span-2"
                />
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="surface-card rounded-[1.75rem] bg-white p-5">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  {t("schedules.form.priceOwnerTitle")}
                </h3>
                <p className="text-sm text-slate-500">
                  {t("schedules.form.priceOwnerDescription")}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <select
                  name="id_empleado_responsable"
                  aria-label={t("schedules.form.owner")}
                  value={form.id_empleado_responsable}
                  onChange={handleChange}
                  className="rounded-xl border px-4 py-3 md:col-span-2"
                >
                  <option value="">{t("schedules.form.assignOwner")}</option>
                  {empleados.map((empleado) => (
                    <option
                      key={empleado.id_empleado}
                      value={empleado.id_empleado}
                      disabled={Boolean(form.proxima_fecha && empleado.disponible_fecha === false)}
                    >
                      {formatEmpleadoOption(empleado, form.proxima_fecha, t)}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  name="precio_acordado"
                  value={form.precio_acordado}
                  onChange={handleChange}
                  placeholder={t("schedules.form.pricePlaceholder")}
                  className="rounded-xl border px-4 py-3"
                />

                <input
                  name="descripcion_precio"
                  value={form.descripcion_precio}
                  onChange={handleChange}
                  placeholder={t("schedules.form.priceNotePlaceholder")}
                  className="rounded-xl border px-4 py-3"
                />
              </div>

              {form.proxima_fecha && (
                <p className="mt-3 rounded-2xl bg-sky-50 px-4 py-3 text-xs text-slate-600">
                  {t("schedules.form.employeeDateHint")}
                </p>
              )}

              <textarea
                name="observaciones"
                value={form.observaciones}
                onChange={handleChange}
                placeholder={t("schedules.form.observationsPlaceholder")}
                rows={3}
                className="mt-3 w-full rounded-xl border px-4 py-3"
              />
            </section>
          )}
        </div>

        <aside className="xl:sticky xl:top-28 xl:self-start">
          <div className="surface-card rounded-[1.75rem] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              {t("schedules.form.summaryTitle")}
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">
              {t("schedules.form.controlTitle")}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {t("schedules.form.controlDescription")}
            </p>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl bg-slate-50/80 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  {t("schedules.form.frequency")}
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{form.frecuencia}</p>
              </div>

              <div className="rounded-2xl bg-slate-50/80 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  {t("schedules.form.owner")}
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {responsableSeleccionado}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900 px-4 py-4 text-white">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-300">
                  {t("schedules.form.price")}
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {form.precio_acordado ? `$${Number(form.precio_acordado).toFixed(2)}` : "$0.00"}
                </p>
              </div>

              <div className="rounded-[1.25rem] border border-slate-200/70 bg-slate-50/80 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">{t("schedules.form.checklistTitle")}</p>
                <ul className="mt-3 space-y-2">
                  <li>{t("schedules.form.checklistLine1")}</li>
                  <li>{t("schedules.form.checklistLine2")}</li>
                  <li>{t("schedules.form.checklistLine3")}</li>
                </ul>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="surface-card sticky bottom-3 z-10 rounded-[1.5rem] bg-white/90 p-3 backdrop-blur md:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {t("schedules.form.stepOf", { current: step + 1, total: progressSteps.length })}
            </p>
            <p className="text-xs text-slate-500">
              {progressSteps[step].hint}
              {draft.lastSavedLabel
                ? ` ${t("schedules.form.savedDraft", { value: draft.lastSavedLabel })}`
                : ""}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="rounded-xl border px-4 py-2">
              {t("schedules.form.cancel")}
            </button>
            {step > 0 && (
              <button
                type="button"
                onClick={() => goToStep(step - 1)}
                className="rounded-xl border px-4 py-2"
              >
                {t("schedules.form.previous")}
              </button>
            )}
            {step < progressSteps.length - 1 ? (
              <button
                type="button"
                onClick={() => goToStep(step + 1)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-white"
              >
                {t("schedules.form.next")}
              </button>
            ) : (
              <button disabled={loading} className="rounded-xl bg-slate-900 px-4 py-2 text-white">
                {loading ? t("schedules.form.saving") : finalSubmitLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
};

export default ProgramacionForm;
