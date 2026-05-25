import { describe, it, expect, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { usePaginatedList } from "../../src/hooks/usePaginatedList";

const ok = (data, pagination = { page: 1, limit: 50, total: data.length, total_pages: 1 }) =>
  Promise.resolve({ data, pagination });

describe("usePaginatedList", () => {
  it("carga datos al montar y expone items + pagination", async () => {
    const fetcher = vi.fn(() => ok([{ id: 1 }, { id: 2 }]));

    const { result } = renderHook(() =>
      usePaginatedList({ fetcher, initialFilters: {}, errorMessage: "X" })
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.items).toHaveLength(2);
    expect(result.current.pagination?.total).toBe(2);
    expect(result.current.error).toBe("");
    expect(fetcher).toHaveBeenCalledWith({ page: 1 });
  });

  it("inyecta filtros no vacíos al fetcher tras applyFilters()", async () => {
    const fetcher = vi.fn(() => ok([]));

    const { result } = renderHook(() =>
      usePaginatedList({
        fetcher,
        initialFilters: { busqueda: "", estado: "" },
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    fetcher.mockClear();

    act(() => {
      result.current.setFilter("busqueda", "pepe");
      result.current.setFilter("estado", "ACTIVO");
    });

    act(() => result.current.applyFilters());

    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(fetcher).toHaveBeenLastCalledWith({
      page: 1,
      busqueda: "pepe",
      estado: "ACTIVO",
    });
  });

  it("setPage(2) dispara un fetch nuevo con page=2", async () => {
    const fetcher = vi.fn(() => ok([]));
    const { result } = renderHook(() => usePaginatedList({ fetcher }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    fetcher.mockClear();

    act(() => result.current.setPage(2));

    await waitFor(() => expect(fetcher).toHaveBeenCalledWith({ page: 2 }));
  });

  it("applyFilters cuando page > 1 vuelve a page 1 (un solo fetch)", async () => {
    const fetcher = vi.fn(() => ok([]));
    const { result } = renderHook(() =>
      usePaginatedList({ fetcher, initialFilters: { q: "" } })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setPage(3));
    await waitFor(() => expect(fetcher).toHaveBeenCalledWith({ page: 3 }));
    fetcher.mockClear();

    act(() => result.current.setFilter("q", "x"));
    act(() => result.current.applyFilters());

    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    // Debe quedar en page 1 con el filtro nuevo
    expect(fetcher).toHaveBeenLastCalledWith({ page: 1, q: "x" });
    expect(result.current.page).toBe(1);
  });

  it("resetFilters vuelve a initialFilters y refetcha", async () => {
    const fetcher = vi.fn(() => ok([]));
    const { result } = renderHook(() =>
      usePaginatedList({ fetcher, initialFilters: { estado: "" } })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setFilter("estado", "ACTIVO"));
    act(() => result.current.applyFilters());
    await waitFor(() => expect(fetcher).toHaveBeenLastCalledWith({ page: 1, estado: "ACTIVO" }));

    fetcher.mockClear();
    act(() => result.current.resetFilters());

    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(fetcher).toHaveBeenLastCalledWith({ page: 1 });
    expect(result.current.filters).toEqual({ estado: "" });
  });

  it("captura errores del fetcher y expone error message", async () => {
    const fetcher = vi.fn(() =>
      Promise.reject({ response: { data: { error: "boom" } } })
    );

    const { result } = renderHook(() =>
      usePaginatedList({ fetcher, errorMessage: "fallback" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("boom");
    expect(result.current.items).toEqual([]);
  });

  it("usa errorMessage como fallback cuando el error no tiene response.data.error", async () => {
    const fetcher = vi.fn(() => Promise.reject(new Error("network")));

    const { result } = renderHook(() =>
      usePaginatedList({ fetcher, errorMessage: "no se pudo" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("no se pudo");
  });

  it("reload() refresca la página actual sin cambiarla", async () => {
    const fetcher = vi.fn(() => ok([]));
    const { result } = renderHook(() => usePaginatedList({ fetcher }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setPage(2));
    await waitFor(() => expect(result.current.page).toBe(2));
    fetcher.mockClear();

    act(() => result.current.reload());
    await waitFor(() => expect(fetcher).toHaveBeenCalledWith({ page: 2 }));
    expect(result.current.page).toBe(2);
  });
});
