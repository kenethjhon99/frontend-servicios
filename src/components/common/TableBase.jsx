import { useEffect, useState } from "react";
import { useI18n } from "../../context/i18n.context";

const MOBILE_BREAKPOINT = 640;

const getRowKey = (row, index) =>
  row.id ||
  row.id_usuario ||
  row.id_cliente ||
  row.id_propiedad ||
  row.id_empleado ||
  row.id_orden_trabajo ||
  row.id_programacion ||
  row.id_ejecucion ||
  row.id_cotizacion ||
  row.id_pago ||
  row.id_credito ||
  row.id_seguimiento ||
  row.id_alerta ||
  index;

const renderCellValue = (row, col) => (col.render ? col.render(row) : row[col.key]);

const TableBase = ({ columns = [], data = [], renderActions }) => {
  const { t } = useI18n();
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (isMobile) {
    return (
      <div className="space-y-4">
        {data.map((row, index) => (
          <div
            key={getRowKey(row, index)}
            className="surface-card table-row-animate rounded-3xl bg-white p-4"
            style={{ animationDelay: `${Math.min(index * 28, 240)}ms` }}
          >
            <div className="space-y-2.5">
              {columns.map((col) => (
                <div key={col.key} className="flex items-start justify-between gap-3">
                  <span className="min-w-0 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {col.label}
                  </span>
                  <div className="min-w-0 flex-1 text-right text-sm font-medium leading-snug text-slate-700">
                    {renderCellValue(row, col) ?? "-"}
                  </div>
                </div>
              ))}

              {renderActions && (
                <div className="border-t border-slate-200/70 pt-3">
                  <div className="flex flex-wrap justify-end gap-2">{renderActions(row)}</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="surface-card overflow-hidden rounded-2xl bg-white">
      <div
        className="soft-scrollbar overflow-x-auto"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <table className="min-w-full text-sm lg:text-base">
          <thead className="bg-slate-50/90">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left font-semibold text-slate-600"
                >
                  {col.label}
                </th>
              ))}
              {renderActions && (
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  {t("common.actions")}
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {data.map((row, index) => (
              <tr
                key={getRowKey(row, index)}
                className="table-row-animate border-t transition-colors duration-200 hover:bg-sky-50/45"
                style={{ animationDelay: `${Math.min(index * 28, 240)}ms` }}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-slate-700">
                    {renderCellValue(row, col)}
                  </td>
                ))}
                {renderActions && <td className="px-4 py-3">{renderActions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableBase;
