import { useMemo } from "react";
import { addDaysISO, getTodayISO } from "../../../utils/date";

export const REMINDER_FILTERS = ["ALL", "DUE", "UPCOMING", "MISSING"];
export const FOLLOW_UP_REPORT_FILTERS = [
  "ALL",
  "PROMESA_PAGO",
  "SIN_RESPUESTA",
  "REAGENDADO",
  "RECORDATORIO",
  "PENDIENTE",
  "ABONO_REALIZADO",
  "DISPUTA",
  "SIN_SEGUIMIENTO",
];

export const useCobranzaInsights = ({
  clientes = [],
  reminderFilter,
  followUpReportFilter,
}) => {
  const groupedClients = useMemo(() => {
    const map = new Map();
    const today = getTodayISO();
    const upcomingLimit = addDaysISO(today, 7);

    clientes.forEach((row) => {
      const key = String(row.id_cliente);
      if (!map.has(key)) {
        map.set(key, {
          id_cliente: row.id_cliente,
          cliente: row.cliente,
          total_creditos: 0,
          saldo_pendiente_total: 0,
          monto_pagado_total: 0,
          creditos_vencidos: 0,
          max_dias_vencido: 0,
          ultimo_pago_fecha: row.ultimo_pago_fecha || null,
          ultimo_pago_monto: row.ultimo_pago_monto || null,
          ultimo_seguimiento_fecha: row.ultimo_seguimiento_fecha || null,
          ultimo_seguimiento_medio: row.ultimo_seguimiento_medio || null,
          ultimo_seguimiento_resultado: row.ultimo_seguimiento_resultado || null,
          proximo_contacto: row.proximo_contacto || null,
          ultima_nota_seguimiento: row.ultima_nota_seguimiento || null,
          id_usuario_responsable: row.id_usuario_responsable || null,
          usuario_responsable: row.usuario_responsable || null,
          credito_principal: row,
        });
      }

      const item = map.get(key);
      item.total_creditos += 1;
      item.saldo_pendiente_total += Number(row.saldo_pendiente || 0);
      item.monto_pagado_total += Number(row.monto_pagado || 0);

      if (Number(row.dias_vencido || 0) > 0) {
        item.creditos_vencidos += 1;
      }

      if (Number(row.dias_vencido || 0) >= Number(item.max_dias_vencido || 0)) {
        item.max_dias_vencido = Number(row.dias_vencido || 0);
      }

      const currentLastPayment = item.ultimo_pago_fecha || "";
      const candidateLastPayment = row.ultimo_pago_fecha || "";
      if (candidateLastPayment && candidateLastPayment >= currentLastPayment) {
        item.ultimo_pago_fecha = row.ultimo_pago_fecha;
        item.ultimo_pago_monto = row.ultimo_pago_monto || null;
      }

      const currentLastFollowUp = item.ultimo_seguimiento_fecha || "";
      const candidateLastFollowUp = row.ultimo_seguimiento_fecha || "";
      if (candidateLastFollowUp && candidateLastFollowUp >= currentLastFollowUp) {
        item.ultimo_seguimiento_fecha = row.ultimo_seguimiento_fecha;
        item.ultimo_seguimiento_medio = row.ultimo_seguimiento_medio || null;
        item.ultimo_seguimiento_resultado = row.ultimo_seguimiento_resultado || null;
        item.proximo_contacto = row.proximo_contacto || null;
        item.ultima_nota_seguimiento = row.ultima_nota_seguimiento || null;
        item.id_usuario_responsable = row.id_usuario_responsable || null;
        item.usuario_responsable = row.usuario_responsable || null;
      }

      if (Number(row.saldo_pendiente || 0) > Number(item.credito_principal?.saldo_pendiente || 0)) {
        item.credito_principal = row;
      }
    });

    return Array.from(map.values())
      .map((item) => {
        let signal = "CONTROLLED";
        let recommendation = "MONITOR";
        let recentMovement = item.ultimo_pago_fecha ? "LAST_PAYMENT" : "NO_PAYMENT";

        if (item.max_dias_vencido >= 8 || item.saldo_pendiente_total >= 500) {
          signal = "ATTENTION";
          recommendation = "STATEMENT_AND_PAYMENT";
        } else if (item.creditos_vencidos > 0 || item.total_creditos > 1) {
          signal = "FOLLOW_UP";
          recommendation = "FOLLOW_UP_CALL";
        }

        if (item.max_dias_vencido >= 31) {
          recommendation = "URGENT_COLLECTION";
        }

        if (item.ultimo_seguimiento_fecha) {
          recentMovement = "FOLLOW_UP";
        }

        if (item.proximo_contacto && item.proximo_contacto <= getTodayISO()) {
          signal = "FOLLOW_UP";
          recommendation = "FOLLOW_UP_CALL";
        }

        let reminderStatus = "CONTROLLED";
        if (item.proximo_contacto && item.proximo_contacto <= today) {
          reminderStatus = "DUE";
        } else if (item.proximo_contacto && item.proximo_contacto <= upcomingLimit) {
          reminderStatus = "UPCOMING";
        } else if (!item.proximo_contacto && item.saldo_pendiente_total > 0) {
          reminderStatus = "MISSING";
        }

        return {
          ...item,
          saldo_pendiente_total: Number(item.saldo_pendiente_total.toFixed(2)),
          monto_pagado_total: Number(item.monto_pagado_total.toFixed(2)),
          signal,
          recommendation,
          recentMovement,
          reminderStatus,
        };
      })
      .sort((a, b) => {
        if (b.max_dias_vencido !== a.max_dias_vencido) {
          return b.max_dias_vencido - a.max_dias_vencido;
        }
        return b.saldo_pendiente_total - a.saldo_pendiente_total;
      });
  }, [clientes]);

  const reminderSummary = useMemo(
    () => ({
      due: groupedClients.filter((client) => client.reminderStatus === "DUE").length,
      upcoming: groupedClients.filter((client) => client.reminderStatus === "UPCOMING").length,
      missing: groupedClients.filter((client) => client.reminderStatus === "MISSING").length,
    }),
    [groupedClients]
  );

  const reminderCards = useMemo(() => {
    const items = groupedClients
      .filter((client) => client.reminderStatus !== "CONTROLLED")
      .filter((client) => reminderFilter === "ALL" || client.reminderStatus === reminderFilter)
      .sort((a, b) => {
        const weight = { DUE: 3, UPCOMING: 2, MISSING: 1, CONTROLLED: 0 };
        if (weight[b.reminderStatus] !== weight[a.reminderStatus]) {
          return weight[b.reminderStatus] - weight[a.reminderStatus];
        }
        if ((a.proximo_contacto || "") !== (b.proximo_contacto || "")) {
          return (a.proximo_contacto || "9999-12-31").localeCompare(
            b.proximo_contacto || "9999-12-31"
          );
        }
        return b.saldo_pendiente_total - a.saldo_pendiente_total;
      });

    return items.slice(0, 8);
  }, [groupedClients, reminderFilter]);

  const collectionFocus = useMemo(() => {
    const highestRiskClient = groupedClients[0] || null;
    const topBalanceClient =
      groupedClients
        .slice()
        .sort((a, b) => b.saldo_pendiente_total - a.saldo_pendiente_total)[0] || null;

    return { highestRiskClient, topBalanceClient };
  }, [groupedClients]);

  const followUpStatusSummary = useMemo(() => {
    const base = {
      PROMESA_PAGO: { count: 0, balance: 0 },
      SIN_RESPUESTA: { count: 0, balance: 0 },
      REAGENDADO: { count: 0, balance: 0 },
      RECORDATORIO: { count: 0, balance: 0 },
      PENDIENTE: { count: 0, balance: 0 },
      ABONO_REALIZADO: { count: 0, balance: 0 },
      DISPUTA: { count: 0, balance: 0 },
      SIN_SEGUIMIENTO: { count: 0, balance: 0 },
    };

    groupedClients.forEach((client) => {
      const key = client.ultimo_seguimiento_resultado || "SIN_SEGUIMIENTO";
      if (!base[key]) {
        base[key] = { count: 0, balance: 0 };
      }
      base[key].count += 1;
      base[key].balance = Number((base[key].balance + client.saldo_pendiente_total).toFixed(2));
    });

    return base;
  }, [groupedClients]);

  const followUpReportRows = useMemo(() => {
    const rows = groupedClients.filter((client) => {
      if (followUpReportFilter === "ALL") return true;
      if (followUpReportFilter === "SIN_SEGUIMIENTO") {
        return !client.ultimo_seguimiento_resultado;
      }
      return client.ultimo_seguimiento_resultado === followUpReportFilter;
    });

    return rows.sort((a, b) => {
      if ((b.max_dias_vencido || 0) !== (a.max_dias_vencido || 0)) {
        return (b.max_dias_vencido || 0) - (a.max_dias_vencido || 0);
      }
      return b.saldo_pendiente_total - a.saldo_pendiente_total;
    });
  }, [followUpReportFilter, groupedClients]);

  const priorityAlerts = useMemo(
    () =>
      groupedClients
        .map((client) => {
          let severity = "LOW";
          let reason = "MONITOR";

          if (client.max_dias_vencido >= 31) {
            severity = "HIGH";
            reason = "OVER_31_DAYS";
          } else if (client.max_dias_vencido >= 8) {
            severity = "HIGH";
            reason = "OVER_8_DAYS";
          } else if (client.creditos_vencidos > 1) {
            severity = "MEDIUM";
            reason = "MULTIPLE_OVERDUE";
          } else if (!client.ultimo_pago_fecha && client.saldo_pendiente_total > 0) {
            severity = "MEDIUM";
            reason = "NO_PAYMENT_HISTORY";
          }

          return {
            ...client,
            severity,
            reason,
          };
        })
        .filter((client) => client.severity !== "LOW" || client.saldo_pendiente_total > 0)
        .sort((a, b) => {
          const severityWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
          if (severityWeight[b.severity] !== severityWeight[a.severity]) {
            return severityWeight[b.severity] - severityWeight[a.severity];
          }
          if (b.max_dias_vencido !== a.max_dias_vencido) {
            return b.max_dias_vencido - a.max_dias_vencido;
          }
          return b.saldo_pendiente_total - a.saldo_pendiente_total;
        })
        .slice(0, 4),
    [groupedClients]
  );

  return {
    groupedClients,
    reminderSummary,
    reminderCards,
    collectionFocus,
    followUpStatusSummary,
    followUpReportRows,
    priorityAlerts,
  };
};
