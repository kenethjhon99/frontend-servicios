import { useEffect, useMemo, useState } from "react";
import { getClientesRequest, getPropiedadesByClienteRequest } from "../../../api/clientes.api";
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
  descripcion: "",
  cantidad: 1,
  precio_unitario: "",
  descripcion_precio: "",
};

const emptyState = {
  id_cliente: "",
  id_propiedad: "",
  vigencia_hasta: "",
  descuento: 0,
  observaciones: "",
  detalles: [{ ...emptyDetalle }],
};

const CotizacionForm = ({
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
  const [servicios, setServicios] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(emptyState);
  const [step, setStep] = useState(0);
  const draft = useFormDraft({
    storageKey: `cotizacion-form-${initialData?.id_cotizacion || "new"}`,
    userScope: draftScope,
    values: { form, step },
  });

  const serviciosMap = useMemo(
    () => new Map(servicios.map((servicio) => [String(servicio.id_servicio), servicio])),
    [servicios]
  );

  useEffect(() => {
    const loadBase = async () => {
      try {
        setLoadError("");
        const [clientesData, serviciosData] = await Promise.all([
          getClientesRequest({ estado: "ACTIVO" }),
          getServiciosRequest({ estado: "ACTIVO" }),
        ]);

        setClientes(Array.isArray(clientesData.data) ? clientesData.data : []);
        setServicios(Array.isArray(serviciosData.data) ? serviciosData.data : []);
      } catch (error) {
        setLoadError(extractApiError(error, t("quotes.form.loadBaseError")));
      }
    };

    loadBase();
  }, [t]);

  useEffect(() => {
    if (!initialData) {
      setForm(emptyState);
      setFormError("");
      setStep(0);
      return;
    }

    setForm({
      id_cliente: initialData.id_cliente ? String(initialData.id_cliente) : "",
      id_propiedad: initialData.id_propiedad ? String(initialData.id_propiedad) : "",
      vigencia_hasta: initialData.vigencia_hasta || "",
      descuento: initialData.descuento ?? 0,
      observaciones: initialData.observaciones || "",
      detalles: initialData.detalles?.length
        ? initialData.detalles.map((detalle) => ({
            id_servicio: detalle.id_servicio ? String(detalle.id_servicio) : "",
            descripcion: detalle.descripcion || detalle.servicio || "",
            cantidad: detalle.cantidad ?? 1,
            precio_unitario: detalle.precio_unitario ?? "",
            descripcion_precio: detalle.descripcion_precio || "",
          }))
        : [{ ...emptyDetalle }],
    });
    setFormError("");
    setStep(0);
  }, [initialData]);

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
        setLoadError(extractApiError(error, t("quotes.form.propertiesLoadError")));
      }
    };

    loadPropiedades();
  }, [form.id_cliente, t]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormError("");
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "id_cliente" ? { id_propiedad: "" } : {}),
    }));
  };

  const handleDetalleChange = (index, name, value) => {
    setFormError("");
    setForm((prev) => {
      const detalles = [...prev.detalles];
      const detalleActual = {
        ...detalles[index],
        [name]: value,
      };

      if (name === "id_servicio") {
        const servicio = serviciosMap.get(String(value));
        if (servicio && !detalleActual.descripcion) {
          detalleActual.descripcion = servicio.nombre;
          if (!detalleActual.precio_unitario && servicio.precio_base !== null) {
            detalleActual.precio_unitario = servicio.precio_base;
          }
        }
      }

      detalles[index] = detalleActual;
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
    setForm((prev) => ({
      ...prev,
      detalles: prev.detalles.filter((_, detalleIndex) => detalleIndex !== index),
    }));
  };

  const subtotal = form.detalles.reduce((acc, item) => {
    return acc + Number(item.cantidad || 0) * Number(item.precio_unitario || 0);
  }, 0);
  const total = Math.max(0, subtotal - Number(form.descuento || 0));

  const progressSteps = [
    {
      label: t("quotes.form.steps.client"),
      hint: t("quotes.form.steps.clientHint"),
      complete: Boolean(form.id_cliente),
    },
    {
      label: t("quotes.form.steps.terms"),
      hint: t("quotes.form.steps.termsHint"),
      complete: Boolean(form.vigencia_hasta || form.id_propiedad || form.observaciones.trim()),
    },
    {
      label: t("quotes.form.steps.details"),
      hint: t("quotes.form.steps.detailsHint"),
      complete: form.detalles.some(
        (item) =>
          item.descripcion?.trim() && Number(item.cantidad) > 0 && item.precio_unitario !== ""
      ),
    },
    {
      label: t("quotes.form.steps.summary"),
      hint: t("quotes.form.steps.summaryHint"),
      complete: total > 0,
    },
  ];

  const validateStep = (stepIndex) => {
    if (stepIndex === 0 && !form.id_cliente) {
      setFormError(t("quotes.form.requiredClient"));
      return false;
    }

    if (stepIndex === 2) {
      const detalleInvalido = form.detalles.some((item) => {
        return (
          !item.descripcion?.trim() ||
          Number(item.cantidad) <= 0 ||
          item.precio_unitario === "" ||
          Number(item.precio_unitario) < 0
        );
      });

      if (detalleInvalido) {
        setFormError(t("quotes.form.invalidDetails"));
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

    if (!form.id_cliente) {
      setFormError(t("quotes.form.clientRequired"));
      return;
    }

    if (!form.detalles.length) {
      setFormError(t("quotes.form.detailRequired"));
      return;
    }

    const detalleInvalido = form.detalles.some((item) => {
      return (
        !item.descripcion?.trim() ||
        Number(item.cantidad) <= 0 ||
        item.precio_unitario === "" ||
        Number(item.precio_unitario) < 0
      );
    });

    if (detalleInvalido) {
      setFormError(t("quotes.form.detailInvalidSubmit"));
      return;
    }

    if (Number(form.descuento || 0) < 0) {
      setFormError(t("quotes.form.invalidDiscount"));
      return;
    }

    await Promise.resolve(
      onSubmit({
        id_cliente: Number(form.id_cliente),
        id_propiedad: form.id_propiedad ? Number(form.id_propiedad) : null,
        vigencia_hasta: form.vigencia_hasta || null,
        descuento: Number(form.descuento || 0),
        observaciones: form.observaciones || null,
        detalles: form.detalles.map((item) => ({
          id_servicio: item.id_servicio ? Number(item.id_servicio) : null,
          descripcion: item.descripcion.trim(),
          cantidad: Number(item.cantidad),
          precio_unitario: Number(item.precio_unitario),
          descripcion_precio: item.descripcion_precio || null,
        })),
      })
    );
    draft.clearDraft();
  };

  const finalSubmitLabel = submitLabel || t("quotes.form.save");

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-24">
      <AlertMessage message={loadError || formError} />

      {draft.hasDraft && (
        <div className="surface-card rounded-[1.25rem] bg-sky-50/80 px-4 py-3 text-sm text-slate-700">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-slate-900">{t("quotes.form.draftTitle")}</p>
              <p className="text-xs text-slate-500">
                {t("quotes.form.draftSaved", { value: draft.lastSavedLabel || "..." })}
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
                {t("quotes.form.restore")}
              </button>
              <button
                type="button"
                onClick={draft.clearDraft}
                className="rounded-xl border px-3 py-2 text-xs font-semibold text-red-600"
              >
                {t("quotes.form.discard")}
              </button>
            </div>
          </div>
        </div>
      )}

      <FormProgress
        title={initialData ? t("quotes.form.titleEdit") : t("quotes.form.titleNew")}
        description={t("quotes.form.description")}
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
                  {t("quotes.form.clientScopeTitle")}
                </h3>
                <p className="text-sm text-slate-500">
                  {t("quotes.form.clientScopeDescription")}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <select
                  name="id_cliente"
                  value={form.id_cliente}
                  onChange={handleChange}
                  className="rounded-xl border px-4 py-3"
                >
                  <option value="">{t("quotes.form.selectClient")}</option>
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
                  <option value="">{t("quotes.form.optionalProperty")}</option>
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
                  {t("quotes.form.commercialTermsTitle")}
                </h3>
                <p className="text-sm text-slate-500">
                  {t("quotes.form.commercialTermsDescription")}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="date"
                  name="vigencia_hasta"
                  value={form.vigencia_hasta}
                  onChange={handleChange}
                  className="rounded-xl border px-4 py-3"
                />

                <input
                  type="number"
                  name="descuento"
                  value={form.descuento}
                  onChange={handleChange}
                  placeholder={t("quotes.form.discountPlaceholder")}
                  className="rounded-xl border px-4 py-3"
                />
              </div>

              <textarea
                name="observaciones"
                value={form.observaciones}
                onChange={handleChange}
                placeholder={t("quotes.form.notesPlaceholder")}
                rows={3}
                className="mt-3 w-full rounded-xl border px-4 py-3"
              />
            </section>
          )}

          {step === 2 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {t("quotes.form.detailsTitle")}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {t("quotes.form.detailsDescription")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addDetalle}
                  className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50"
                >
                  {t("quotes.form.addDetail")}
                </button>
              </div>

              {form.detalles.map((item, index) => (
                <div key={index} className="surface-card rounded-[1.5rem] bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-medium">{t("quotes.form.detailNumber", { value: index + 1 })}</h4>

                    {form.detalles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDetalle(index)}
                        className="rounded-lg border px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        {t("quotes.form.remove")}
                      </button>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <select
                      value={item.id_servicio}
                      onChange={(e) => handleDetalleChange(index, "id_servicio", e.target.value)}
                      className="rounded-xl border bg-white px-4 py-3"
                    >
                      <option value="">{t("quotes.form.optionalService")}</option>
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
                      placeholder={t("quotes.form.quantityPlaceholder")}
                      className="rounded-xl border bg-white px-4 py-3"
                    />

                    <input
                      value={item.descripcion}
                      onChange={(e) => handleDetalleChange(index, "descripcion", e.target.value)}
                      placeholder={t("quotes.form.descriptionPlaceholder")}
                      className="rounded-xl border bg-white px-4 py-3 md:col-span-2"
                    />

                    <input
                      type="number"
                      value={item.precio_unitario}
                      onChange={(e) =>
                        handleDetalleChange(index, "precio_unitario", e.target.value)
                      }
                      placeholder={t("quotes.form.unitPricePlaceholder")}
                      className="rounded-xl border bg-white px-4 py-3"
                    />

                    <input
                      value={item.descripcion_precio}
                      onChange={(e) =>
                        handleDetalleChange(index, "descripcion_precio", e.target.value)
                      }
                      placeholder={t("quotes.form.priceNotePlaceholder")}
                      className="rounded-xl border bg-white px-4 py-3"
                    />
                  </div>
                </div>
              ))}
            </section>
          )}

          {step === 3 && (
            <section className="surface-card rounded-[1.75rem] bg-white p-5">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  {t("quotes.form.reviewTitle")}
                </h3>
                <p className="text-sm text-slate-500">{t("quotes.form.reviewDescription")}</p>
              </div>

              <div className="rounded-[1.25rem] border border-slate-200/70 bg-slate-50/80 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">{t("quotes.form.quickSummary")}</p>
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
                          ?.nombre_propiedad || t("quotes.form.noProperty"),
                    })}
                  </li>
                  <li>{t("quotes.validity")}: {form.vigencia_hasta || t("quotes.form.noDate")}</li>
                  <li>{t("quotes.form.concepts", { value: form.detalles.length })}</li>
                  <li>{t("quotes.form.discountValue", { value: formatCurrency(form.descuento || 0) })}</li>
                </ul>
              </div>
            </section>
          )}
        </div>

        <aside className="xl:sticky xl:top-28 xl:self-start">
          <div className="surface-card rounded-[1.75rem] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              {t("quotes.form.summaryTitle")}
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">
              {t("quotes.form.totalsTitle")}
            </h3>
            <p className="mt-2 text-sm text-slate-500">{t("quotes.form.totalsDescription")}</p>

            <div className="mt-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span>{t("quotes.form.subtotal")}</span>
                <strong>{formatCurrency(subtotal)}</strong>
              </div>

              <div className="flex justify-between text-sm">
                <span>{t("quotes.detailPage.discount")}</span>
                <strong>{formatCurrency(form.descuento || 0)}</strong>
              </div>

              <div className="flex justify-between rounded-2xl bg-slate-900 px-4 py-4 text-lg text-white">
                <span>{t("quotes.form.total")}</span>
                <strong>{formatCurrency(total)}</strong>
              </div>
            </div>

            <div className="mt-5 rounded-[1.25rem] border border-slate-200/70 bg-slate-50/80 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">{t("quotes.form.beforeSave")}</p>
              <ul className="mt-3 space-y-2">
                <li>{t("quotes.form.beforeSaveLine1")}</li>
                <li>{t("quotes.form.beforeSaveLine2")}</li>
                <li>{t("quotes.form.beforeSaveLine3")}</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>

      <div className="surface-card sticky bottom-3 z-10 rounded-[1.5rem] bg-white/90 p-3 backdrop-blur md:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {t("quotes.form.stepOf", { current: step + 1, total: progressSteps.length })}
            </p>
            <p className="text-xs text-slate-500">
              {progressSteps[step].hint}
              {draft.lastSavedLabel
                ? ` ${t("quotes.form.savedDraft", { value: draft.lastSavedLabel })}`
                : ""}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="rounded-xl border px-4 py-2">
              {t("quotes.form.cancel")}
            </button>
            {step > 0 && (
              <button
                type="button"
                onClick={() => goToStep(step - 1)}
                className="rounded-xl border px-4 py-2"
              >
                {t("quotes.form.previous")}
              </button>
            )}
            {step < progressSteps.length - 1 ? (
              <button
                type="button"
                onClick={() => goToStep(step + 1)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-white"
              >
                {t("quotes.form.next")}
              </button>
            ) : (
              <button disabled={loading} className="rounded-xl bg-slate-900 px-4 py-2 text-white">
                {loading ? t("quotes.form.saving") : finalSubmitLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
};

export default CotizacionForm;
