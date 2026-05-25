const escapeCsvValue = (value) => {
  if (value == null) return "";
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const buildCsvSection = (title, headers, rows) => {
  const lines = [];
  lines.push(title);
  lines.push(headers.map(escapeCsvValue).join(","));
  rows.forEach((row) => {
    lines.push(row.map(escapeCsvValue).join(","));
  });
  lines.push("");
  return lines.join("\n");
};

export const buildAgendaSemanalCsv = ({
  fechaDesde,
  fechaHasta,
  ownerLabel,
  summary,
  ownerSummary,
  visibleDays,
}) => {
  const sections = [];

  sections.push(
    buildCsvSection(
      "weekly_report",
      ["range_start", "range_end", "owner_filter", "week_schedules", "week_orders", "days_needing_action", "days_with_orders"],
      [[
        fechaDesde,
        fechaHasta,
        ownerLabel,
        summary.totalProgramaciones,
        summary.totalOrdenes,
        summary.daysNeedingAction,
        summary.daysWithOrders,
      ]],
    ),
  );

  sections.push(
    buildCsvSection(
      "owner_summary",
      ["owner", "signal", "assigned", "without_visit", "without_order", "with_order"],
      ownerSummary.map((item) => [
        item.label,
        item.signal,
        item.total,
        item.withoutVisit,
        item.withoutOrder,
        item.withOrder,
      ]),
    ),
  );

  const dayRows = [];
  visibleDays.forEach((day) => {
    day.programaciones.forEach((row) => {
      dayRows.push([
        day.fecha,
        "schedule",
        row.cliente,
        row.servicio,
        row.empleado_responsable || "Unassigned",
        row.hora_programada || "",
        row.estado_visita_actual || "SIN_VISITA",
        row.id_orden_trabajo_visita || "",
      ]);
    });

    day.ordenes.forEach((row) => {
      dayRows.push([
        day.fecha,
        "order",
        row.cliente,
        row.numero_orden,
        "",
        row.hora_inicio_programada || "",
        row.estado,
        row.id_orden_trabajo,
      ]);
    });
  });

  sections.push(
    buildCsvSection(
      "daily_detail",
      ["date", "type", "client", "reference", "owner", "hour", "status", "linked_order"],
      dayRows,
    ),
  );

  return "\uFEFF" + sections.join("\n");
};

export const downloadAgendaSemanalCsv = (payload) => {
  const csvContent = buildAgendaSemanalCsv(payload);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `agenda-semanal-${payload.fechaDesde}-${payload.fechaHasta}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const buildCobranzaCsv = ({
  filters,
  resumen,
  buckets,
  clientes,
  followUpStatusSummary,
  followUpReportRows,
}) => {
  const sections = [];

  sections.push(
    buildCsvSection(
      "collections_report",
      [
        "date_from",
        "date_to",
        "status",
        "client_id",
        "only_overdue",
        "only_partial",
        "outstanding_balance",
        "overdue_credits",
        "partial_credits",
        "collected_in_range",
        "clients_with_balance",
      ],
      [[
        filters?.fecha_desde || "",
        filters?.fecha_hasta || "",
        filters?.estado || "",
        filters?.id_cliente || "",
        filters?.solo_vencidos ? "true" : "false",
        filters?.solo_parciales ? "true" : "false",
        resumen?.saldo_pendiente_total || 0,
        resumen?.creditos_vencidos || 0,
        resumen?.creditos_parciales || 0,
        resumen?.pagos_cobrados_rango || 0,
        resumen?.clientes_con_saldo || 0,
      ]]
    )
  );

  sections.push(
    buildCsvSection(
      "aging_buckets",
      ["bucket", "count", "outstanding_balance"],
      [
        ["current", buckets?.al_dia?.count || 0, buckets?.al_dia?.saldo_pendiente || 0],
        ["1_7_days", buckets?.vence_1_7?.count || 0, buckets?.vence_1_7?.saldo_pendiente || 0],
        ["8_30_days", buckets?.vence_8_30?.count || 0, buckets?.vence_8_30?.saldo_pendiente || 0],
        ["31_plus_days", buckets?.vence_31_mas?.count || 0, buckets?.vence_31_mas?.saldo_pendiente || 0],
      ]
    )
  );

  sections.push(
    buildCsvSection(
      "collections_detail",
      [
        "client_id",
        "client",
        "credit_id",
        "order_id",
        "order_number",
        "status",
        "due_date",
        "total_amount",
        "paid_amount",
        "outstanding_balance",
        "overdue_days",
        "last_payment_date",
        "last_payment_amount",
        "last_follow_up_date",
        "last_follow_up_result",
        "next_contact",
        "responsible_user",
      ],
      (clientes || []).map((row) => [
        row.id_cliente,
        row.cliente,
        row.id_credito,
        row.id_orden_trabajo,
        row.numero_orden,
        row.estado,
        row.fecha_vencimiento,
        row.monto_total,
        row.monto_pagado,
        row.saldo_pendiente,
        row.dias_vencido,
        row.ultimo_pago_fecha || "",
        row.ultimo_pago_monto ?? "",
        row.ultimo_seguimiento_fecha || "",
        row.ultimo_seguimiento_resultado || "SIN_SEGUIMIENTO",
        row.proximo_contacto || "",
        row.usuario_responsable || "",
      ])
    )
  );

  sections.push(
    buildCsvSection(
      "follow_up_status_summary",
      ["status", "count", "tracked_balance"],
      Object.entries(followUpStatusSummary || {}).map(([status, item]) => [
        status,
        item?.count || 0,
        item?.balance || 0,
      ])
    )
  );

  sections.push(
    buildCsvSection(
      "follow_up_report",
      [
        "client_id",
        "client",
        "status",
        "outstanding_balance",
        "max_overdue_days",
        "next_contact",
        "last_follow_up_date",
        "responsible_user",
      ],
      (followUpReportRows || []).map((row) => [
        row.id_cliente,
        row.cliente,
        row.ultimo_seguimiento_resultado || "SIN_SEGUIMIENTO",
        row.saldo_pendiente_total,
        row.max_dias_vencido || 0,
        row.proximo_contacto || "",
        row.ultimo_seguimiento_fecha || "",
        row.usuario_responsable || "",
      ])
    )
  );

  return "\uFEFF" + sections.join("\n");
};

export const downloadCobranzaCsv = (payload) => {
  const csvContent = buildCobranzaCsv(payload);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cobranza-${payload.filters?.fecha_desde || "desde"}-${
    payload.filters?.fecha_hasta || "hasta"
  }.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
