import { useCallback, useEffect, useRef, useState } from "react";
import { extractApiError } from "../lib/api";

/**
 * Hook genérico para listados paginados con filtros.
 *
 * Encapsula el patrón repetido en 9 páginas:
 *   - state de items + pagination + page + loading + error
 *   - state de filters
 *   - useEffect que dispara fetch al cambiar page
 *   - applyFilters() que reinicia page=1 (o re-dispara si ya estaba en 1)
 *   - reload() para refrescar la página actual (después de crear/editar)
 *
 * Uso:
 *   const list = usePaginatedList({
 *     fetcher: getClientesRequest,
 *     initialFilters: { busqueda: "", estado: "" },
 *     errorMessage: "No se pudieron cargar los clientes.",
 *   });
 *   list.items, list.pagination, list.page, list.setPage, list.loading,
 *   list.error, list.filters, list.setFilter("busqueda", "x"), list.applyFilters(),
 *   list.resetFilters(), list.reload()
 *
 * @param {object} options
 * @param {(params: object) => Promise<{data, pagination}>} options.fetcher
 * @param {object} [options.initialFilters={}]
 * @param {string} [options.errorMessage="No se pudieron cargar los datos."]
 */
export const usePaginatedList = ({
  fetcher,
  initialFilters = {},
  errorMessage = "No se pudieron cargar los datos.",
}) => {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState(initialFilters);

  // Mantenemos los filtros aplicados (los que se usaron en el último fetch)
  // separados de los que el usuario está editando en pantalla.
  const filtersRef = useRef(filters);
  const initialFiltersRef = useRef(initialFilters);

  const load = useCallback(
    async (targetPage) => {
      try {
        setLoading(true);
        setError("");

        const params = { page: targetPage };
        Object.entries(filtersRef.current).forEach(([key, value]) => {
          if (value !== "" && value !== null && value !== undefined) {
            params[key] = value;
          }
        });

        const { data, pagination: pag } = await fetcher(params);
        setItems(data);
        setPagination(pag);
      } catch (err) {
        setError(extractApiError(err, errorMessage));
      } finally {
        setLoading(false);
      }
    },
    [fetcher, errorMessage]
  );

  useEffect(() => {
    load(page);
  }, [page, load]);

  const setFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyFilters = useCallback(() => {
    filtersRef.current = filters;
    if (page === 1) {
      load(1);
    } else {
      setPage(1); // dispara el useEffect
    }
  }, [filters, page, load]);

  const resetFilters = useCallback(() => {
    setFilters(initialFiltersRef.current);
    filtersRef.current = initialFiltersRef.current;
    if (page === 1) {
      load(1);
    } else {
      setPage(1);
    }
  }, [page, load]);

  const reload = useCallback(() => {
    load(page);
  }, [page, load]);

  return {
    items,
    pagination,
    page,
    setPage,
    loading,
    error,
    setError,
    filters,
    setFilters,
    setFilter,
    applyFilters,
    resetFilters,
    reload,
  };
};
