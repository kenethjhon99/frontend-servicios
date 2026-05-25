import { useState } from "react";
import AlertMessage from "../../../components/common/AlertMessage";
import FormProgress from "../../../components/common/FormProgress";
import { useAuth } from "../../../context/auth.context";
import { useI18n } from "../../../context/i18n.context";
import { useFormDraft } from "../../../hooks/useFormDraft";

const initialState = {
  codigo_cliente: "",
  nombre_completo: "",
  nombre_empresa: "",
  telefono: "",
  telefono_secundario: "",
  correo: "",
  nit: "",
  id_documento: "",
  direccion_principal: "",
  tipo_cliente: "HABITUAL",
  observaciones: "",
  idioma_preferido: "en",
};

const buildState = (initialData) => {
  if (!initialData) return initialState;
  return {
    codigo_cliente: initialData.codigo_cliente || "",
    nombre_completo: initialData.nombre_completo || "",
    nombre_empresa: initialData.nombre_empresa || "",
    telefono: initialData.telefono || "",
    telefono_secundario: initialData.telefono_secundario || "",
    correo: initialData.correo || "",
    nit: initialData.nit || "",
    id_documento: initialData.id_documento || initialData.dpi || "",
    direccion_principal: initialData.direccion_principal || "",
    tipo_cliente: initialData.tipo_cliente || "HABITUAL",
    observaciones: initialData.observaciones || "",
    idioma_preferido: initialData.idioma_preferido || "en",
  };
};

const getTipoRegistro = (data) => (data?.nombre_empresa ? "EMPRESA" : "PERSONA");

const ClienteForm = ({ initialData = null, onSubmit, onCancel, loading = false }) => {
  const auth = useAuth();
  const { t } = useI18n();
  const draftScope =
    auth?.user?.id_usuario ||
    auth?.user?.username ||
    auth?.user?.correo ||
    auth?.user?.nombre ||
    "guest";
  const [form, setForm] = useState(() => buildState(initialData));
  const [formError, setFormError] = useState("");
  const [lastInitialData, setLastInitialData] = useState(initialData);
  const [tipoRegistro, setTipoRegistro] = useState(() => getTipoRegistro(initialData));
  const [step, setStep] = useState(0);
  const draft = useFormDraft({
    storageKey: `cliente-form-${initialData?.id_cliente || "new"}`,
    userScope: draftScope,
    values: { form, tipoRegistro, step },
  });

  if (initialData !== lastInitialData) {
    setLastInitialData(initialData);
    setForm(buildState(initialData));
    setTipoRegistro(getTipoRegistro(initialData));
    setFormError("");
    setStep(0);
  }

  const steps = [
    {
      label: t("clients.form.steps.identity"),
      hint: t("clients.form.steps.identityHint"),
      complete: Boolean(
        form.nombre_completo.trim() && (tipoRegistro === "PERSONA" || form.nombre_empresa.trim())
      ),
    },
    {
      label: t("clients.form.steps.contact"),
      hint: t("clients.form.steps.contactHint"),
      complete: Boolean(form.telefono || form.correo || form.id_documento || form.nit),
    },
    {
      label: t("clients.form.steps.preferences"),
      hint: t("clients.form.steps.preferencesHint"),
      complete: Boolean(form.idioma_preferido),
    },
  ];

  const getIdiomaLabel = (lang) =>
    lang === "en" ? t("clients.preferredLanguageEn") : t("clients.preferredLanguageEs");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormError("");
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateStep = (stepIndex) => {
    if (stepIndex === 0) {
      if (!form.nombre_completo.trim()) {
        setFormError(t("clients.form.requiredName"));
        return false;
      }

      if (tipoRegistro === "EMPRESA" && !form.nombre_empresa.trim()) {
        setFormError(t("clients.form.requiredCompany"));
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

    if (!validateStep(0) || !validateStep(1) || !validateStep(2)) {
      return;
    }

    await Promise.resolve(
      onSubmit({
        ...form,
        nombre_empresa: tipoRegistro === "EMPRESA" ? form.nombre_empresa : "",
      })
    );
    draft.clearDraft();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-24">
      <AlertMessage message={formError} />

      {draft.hasDraft && (
        <div className="surface-card rounded-[1.25rem] bg-sky-50/80 px-4 py-3 text-sm text-slate-700">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-slate-900">{t("clients.form.draftTitle")}</p>
              <p className="text-xs text-slate-500">
                {t("clients.form.draftSaved", { value: draft.lastSavedLabel || "..." })}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  draft.restoreDraft((snapshot) => {
                    setForm(snapshot.form);
                    setTipoRegistro(snapshot.tipoRegistro);
                    setStep(snapshot.step || 0);
                  })
                }
                className="rounded-xl border px-3 py-2 text-xs font-semibold"
              >
                {t("clients.form.restore")}
              </button>
              <button
                type="button"
                onClick={draft.clearDraft}
                className="rounded-xl border px-3 py-2 text-xs font-semibold text-red-600"
              >
                {t("clients.form.discard")}
              </button>
            </div>
          </div>
        </div>
      )}

      <FormProgress
        title={initialData ? t("clients.form.titleEdit") : t("clients.form.titleNew")}
        description={t("clients.form.description")}
        steps={steps}
        activeIndex={step}
        onStepChange={goToStep}
      />

      <section className="surface-card rounded-[1.75rem] bg-white p-5">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{t("clients.form.identityTitle")}</h3>
              <p className="text-sm text-slate-500">{t("clients.form.identityDescription")}</p>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-slate-500">{t("clients.form.billingType")}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTipoRegistro("PERSONA")}
                  className={`rounded-full border px-4 py-2 text-sm ${
                    tipoRegistro === "PERSONA"
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 text-slate-700"
                  }`}
                >
                  {t("clients.form.person")}
                </button>
                <button
                  type="button"
                  onClick={() => setTipoRegistro("EMPRESA")}
                  className={`rounded-full border px-4 py-2 text-sm ${
                    tipoRegistro === "EMPRESA"
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 text-slate-700"
                  }`}
                >
                  {t("clients.form.companyOption")}
                </button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                name="codigo_cliente"
                value={form.codigo_cliente}
                onChange={handleChange}
                placeholder={t("clients.form.codePlaceholder")}
                className="rounded-xl border px-4 py-3"
              />
              <input
                name="nombre_completo"
                value={form.nombre_completo}
                onChange={handleChange}
                placeholder={
                  tipoRegistro === "EMPRESA"
                    ? t("clients.form.companyContactPlaceholder")
                    : t("clients.form.namePlaceholder")
                }
                className="rounded-xl border px-4 py-3"
              />
              {tipoRegistro === "EMPRESA" && (
                <input
                  name="nombre_empresa"
                  value={form.nombre_empresa}
                  onChange={handleChange}
                  placeholder={t("clients.form.companyPlaceholder")}
                  className="rounded-xl border px-4 py-3 md:col-span-2"
                />
              )}
              <select
                name="tipo_cliente"
                value={form.tipo_cliente}
                onChange={handleChange}
                className="rounded-xl border px-4 py-3"
              >
                <option value="HABITUAL">{t("clients.quickHabitual")}</option>
                <option value="NO_HABITUAL">{t("clients.quickNonHabitual")}</option>
              </select>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{t("clients.form.contactTitle")}</h3>
              <p className="text-sm text-slate-500">{t("clients.form.contactDescription")}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                placeholder={t("clients.form.phonePlaceholder")}
                className="rounded-xl border px-4 py-3"
              />
              <input
                name="telefono_secundario"
                value={form.telefono_secundario}
                onChange={handleChange}
                placeholder={t("clients.form.secondaryPhonePlaceholder")}
                className="rounded-xl border px-4 py-3"
              />
              <input
                name="correo"
                value={form.correo}
                onChange={handleChange}
                placeholder={t("clients.form.emailPlaceholder")}
                className="rounded-xl border px-4 py-3"
              />
              <input
                name="nit"
                value={form.nit}
                onChange={handleChange}
                placeholder={t("clients.form.taxIdPlaceholder")}
                className="rounded-xl border px-4 py-3"
              />
              <input
                name="id_documento"
                value={form.id_documento}
                onChange={handleChange}
                placeholder={t("clients.form.idPlaceholder")}
                className="rounded-xl border px-4 py-3"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{t("clients.form.preferencesTitle")}</h3>
              <p className="text-sm text-slate-500">{t("clients.form.preferencesDescription")}</p>
            </div>

            <div className="space-y-2">
              <span className="text-xs text-slate-500">{t("clients.form.languageTitle")}</span>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  {
                    value: "en",
                    title: t("clients.form.englishPrimary"),
                    description: t("clients.form.englishDescription"),
                  },
                  {
                    value: "es",
                    title: t("clients.form.spanishPrimary"),
                    description: t("clients.form.spanishDescription"),
                  },
                ].map((option) => {
                  const selected = form.idioma_preferido === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        handleChange({ target: { name: "idioma_preferido", value: option.value } })
                      }
                      className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${
                        selected
                          ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{option.title}</p>
                          <p className={`mt-1 text-sm ${selected ? "text-slate-200" : "text-slate-500"}`}>
                            {option.description}
                          </p>
                        </div>
                        <span
                          className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold ${
                            selected
                              ? "border-white/40 bg-white/15 text-white"
                              : "border-slate-300 bg-slate-50 text-slate-500"
                          }`}
                        >
                          {selected ? "OK" : option.value.toUpperCase()}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <textarea
              name="direccion_principal"
              value={form.direccion_principal}
              onChange={handleChange}
              placeholder={t("clients.form.addressPlaceholder")}
              rows={2}
              className="w-full rounded-xl border px-4 py-3"
            />

            <textarea
              name="observaciones"
              value={form.observaciones}
              onChange={handleChange}
              placeholder={t("clients.form.notesPlaceholder")}
              rows={3}
              className="w-full rounded-xl border px-4 py-3"
            />

            <div className="rounded-[1.25rem] border border-slate-200/70 bg-slate-50/80 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">{t("clients.form.summary")}</p>
              <ul className="mt-3 space-y-2">
                <li>
                  {t("clients.form.summaryBilling", {
                    value: tipoRegistro === "EMPRESA" ? t("clients.form.companyOption") : t("clients.form.person"),
                  })}
                </li>
                <li>
                  {t("clients.form.summaryCode", {
                    value: form.codigo_cliente || t("clients.form.autoGenerated"),
                  })}
                </li>
                <li>
                  {t("clients.form.summaryLanguage", {
                    value: getIdiomaLabel(form.idioma_preferido),
                  })}
                </li>
              </ul>
            </div>
          </div>
        )}
      </section>

      <div className="surface-card sticky bottom-3 z-10 rounded-[1.5rem] bg-white/90 p-3 backdrop-blur md:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {t("clients.form.stepOf", { current: step + 1, total: steps.length })}
            </p>
            <p className="text-xs text-slate-500">
              {steps[step].hint}
              {draft.lastSavedLabel ? ` ${t("clients.form.savedDraft", { value: draft.lastSavedLabel })}` : ""}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="rounded-xl border px-4 py-2">
              {t("clients.form.cancel")}
            </button>
            {step > 0 && (
              <button
                type="button"
                onClick={() => goToStep(step - 1)}
                className="rounded-xl border px-4 py-2"
              >
                {t("clients.form.previous")}
              </button>
            )}
            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => goToStep(step + 1)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-white"
              >
                {t("clients.form.next")}
              </button>
            ) : (
              <button disabled={loading} className="rounded-xl bg-slate-900 px-4 py-2 text-white">
                {loading ? t("clients.form.saving") : t("clients.form.save")}
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
};

export default ClienteForm;
