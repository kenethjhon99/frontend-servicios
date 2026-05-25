export const getTodayISO = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);
  return local.toISOString().split("T")[0];
};

export const getCurrentYearMonth = () => {
  const now = new Date();

  return {
    anio: now.getFullYear(),
    mes: now.getMonth() + 1,
  };
};

const toLocalDate = (date) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000);
};

export const addDaysISO = (dateString, days) => {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toLocalDate(date).toISOString().split("T")[0];
};

export const getCurrentWeekRange = () => {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    fecha_desde: toLocalDate(monday).toISOString().split("T")[0],
    fecha_hasta: toLocalDate(sunday).toISOString().split("T")[0],
  };
};

export const buildDateRange = (fechaDesde, fechaHasta) => {
  if (!fechaDesde || !fechaHasta) return [];
  const dates = [];
  let current = fechaDesde;

  while (current <= fechaHasta) {
    dates.push(current);
    current = addDaysISO(current, 1);
  }

  return dates;
};

export const formatDateLabel = (dateString) => {
  if (!dateString) return "—";

  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("es-GT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};
