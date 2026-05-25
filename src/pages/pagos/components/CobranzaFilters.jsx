const CobranzaFilters = ({
  filters,
  clientes,
  t,
  onSubmit,
  onChange,
  onReset,
}) => (
  <form
    onSubmit={onSubmit}
    className="print-hidden grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-3 xl:grid-cols-6"
  >
    <input
      type="date"
      name="fecha_desde"
      value={filters.fecha_desde}
      onChange={onChange}
      className="rounded-xl border px-4 py-3 outline-none"
    />

    <input
      type="date"
      name="fecha_hasta"
      value={filters.fecha_hasta}
      onChange={onChange}
      className="rounded-xl border px-4 py-3 outline-none"
    />

    <select
      name="estado"
      value={filters.estado}
      onChange={onChange}
      className="rounded-xl border px-4 py-3 outline-none"
    >
      <option value="">{t("collections.allStatuses")}</option>
      <option value="PENDIENTE">PENDIENTE</option>
      <option value="PARCIAL">PARCIAL</option>
      <option value="VENCIDO">VENCIDO</option>
      <option value="PAGADO">PAGADO</option>
      <option value="CANCELADO">CANCELADO</option>
    </select>

    <select
      name="id_cliente"
      value={filters.id_cliente}
      onChange={onChange}
      className="rounded-xl border px-4 py-3 outline-none"
    >
      <option value="">{t("collections.allClients")}</option>
      {clientes.map((cliente) => (
        <option key={cliente.id_cliente} value={cliente.id_cliente}>
          {cliente.nombre_completo}
        </option>
      ))}
    </select>

    <label className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm text-slate-700">
      <input
        type="checkbox"
        name="solo_vencidos"
        checked={filters.solo_vencidos}
        onChange={onChange}
      />
      {t("collections.onlyOverdue")}
    </label>

    <label className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm text-slate-700">
      <input
        type="checkbox"
        name="solo_parciales"
        checked={filters.solo_parciales}
        onChange={onChange}
      />
      {t("collections.onlyPartial")}
    </label>

    <div className="md:col-span-3 xl:col-span-6 flex flex-wrap gap-2">
      <button
        type="submit"
        className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
      >
        {t("common.filter")}
      </button>
      <button
        type="button"
        onClick={onReset}
        className="rounded-xl border px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        {t("common.clear")}
      </button>
    </div>
  </form>
);

export default CobranzaFilters;
