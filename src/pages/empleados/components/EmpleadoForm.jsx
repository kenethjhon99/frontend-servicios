import { useState } from "react";
import AlertMessage from "../../../components/common/AlertMessage";
import { useI18n } from "../../../context/i18n.context";
import { formatCurrency } from "../../../utils/currency";

const DIAS_PAGO_SEMANAL = 7;

const buildState = (initialData) => ({
  nombre_completo: initialData?.nombre_completo || "",
  telefono: initialData?.telefono || "",
  correo: initialData?.correo || "",
  especialidad: initialData?.especialidad || "",
  puesto: initialData?.puesto || "",
  horas_trabajo_dia:
    initialData?.horas_trabajo_dia === null || initialData?.horas_trabajo_dia === undefined
      ? ""
      : String(initialData.horas_trabajo_dia),
  pago_diario:
    initialData?.pago_diario === null || initialData?.pago_diario === undefined
      ? ""
      : String(initialData.pago_diario),
});

const EmpleadoForm = ({ initialData = null, onSubmit, onCancel, loading = false, submitLabel }) => {
  const { t } = useI18n();
  const [form, setForm] = useState(() => buildState(initialData));
  const [error, setError] = useState("");
  const horasTrabajoDia = form.horas_trabajo_dia === "" ? null : Number(form.horas_trabajo_dia);
  const pagoDiario = form.pago_diario === "" ? null : Number(form.pago_diario);
  const pagoSemanalEstimado =
    Number.isFinite(pagoDiario) && pagoDiario >= 0 ? pagoDiario * DIAS_PAGO_SEMANAL : null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setError("");
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.nombre_completo.trim()) {
      setError(t("employees.form.requiredName"));
      return;
    }

    if (
      form.horas_trabajo_dia !== "" &&
      (!Number.isFinite(horasTrabajoDia) || horasTrabajoDia < 0)
    ) {
      setError(t("employees.form.invalidHours"));
      return;
    }

    if (form.pago_diario !== "" && (!Number.isFinite(pagoDiario) || pagoDiario < 0)) {
      setError(t("employees.form.invalidDailyPay"));
      return;
    }

    onSubmit({
      id_cuadrilla: initialData?.id_cuadrilla || null,
      nombre_completo: form.nombre_completo.trim(),
      telefono: form.telefono.trim() || null,
      correo: form.correo.trim() || null,
      especialidad: form.especialidad.trim() || null,
      puesto: form.puesto.trim() || null,
      horas_trabajo_dia: form.horas_trabajo_dia === "" ? null : horasTrabajoDia,
      pago_diario: form.pago_diario === "" ? null : pagoDiario,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AlertMessage message={error} />

      <input
        type="text"
        name="nombre_completo"
        value={form.nombre_completo}
        onChange={handleChange}
        placeholder={t("employees.form.namePlaceholder")}
        className="w-full rounded-xl border px-4 py-3"
      />

      <div className="grid gap-3 md:grid-cols-2">
        <input
          type="text"
          name="telefono"
          value={form.telefono}
          onChange={handleChange}
          placeholder={t("employees.form.phonePlaceholder")}
          className="rounded-xl border px-4 py-3"
        />

        <input
          type="email"
          name="correo"
          value={form.correo}
          onChange={handleChange}
          placeholder={t("employees.form.emailPlaceholder")}
          className="rounded-xl border px-4 py-3"
        />

        <input
          type="text"
          name="puesto"
          value={form.puesto}
          onChange={handleChange}
          placeholder={t("employees.form.rolePlaceholder")}
          className="rounded-xl border px-4 py-3"
        />

        <input
          type="text"
          name="especialidad"
          value={form.especialidad}
          onChange={handleChange}
          placeholder={t("employees.form.specialtyPlaceholder")}
          className="rounded-xl border px-4 py-3"
        />

        <input
          type="number"
          min="0"
          step="0.25"
          name="horas_trabajo_dia"
          value={form.horas_trabajo_dia}
          onChange={handleChange}
          placeholder={t("employees.form.hoursPlaceholder")}
          className="rounded-xl border px-4 py-3"
        />

        <input
          type="number"
          min="0"
          step="0.01"
          name="pago_diario"
          value={form.pago_diario}
          onChange={handleChange}
          placeholder={t("employees.form.dailyPayPlaceholder")}
          className="rounded-xl border px-4 py-3"
        />
      </div>

      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <p className="font-medium text-slate-900">{t("employees.form.weeklySummaryTitle")}</p>
        <p>
          {t("employees.form.summaryHoursPerDay", { value: form.horas_trabajo_dia || "-" })} /{" "}
          {t("employees.form.summaryDailyPay", {
            value:
              pagoDiario === null || !Number.isFinite(pagoDiario)
                ? "-"
                : formatCurrency(pagoDiario),
          })}
        </p>
        <p>
          {t("employees.form.summaryWeeklyPay", {
            days: DIAS_PAGO_SEMANAL,
            value: pagoSemanalEstimado === null ? "-" : formatCurrency(pagoSemanalEstimado),
          })}
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-xl border px-4 py-2">
          {t("employees.form.cancel")}
        </button>

        <button disabled={loading} className="rounded-xl bg-slate-900 px-4 py-2 text-white">
          {loading ? t("employees.form.saving") : submitLabel || t("employees.saveLabel")}
        </button>
      </div>
    </form>
  );
};

export default EmpleadoForm;
