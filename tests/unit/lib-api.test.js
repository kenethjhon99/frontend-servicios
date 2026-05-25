import { describe, it, expect } from "vitest";
import { extractListPayload, extractApiError } from "../../src/lib/api";

describe("extractListPayload", () => {
  it("extrae { data, pagination } cuando el backend devuelve el shape estándar", () => {
    const response = {
      data: {
        data: [{ id: 1 }, { id: 2 }],
        pagination: { page: 1, limit: 50, total: 2, total_pages: 1 },
      },
    };
    expect(extractListPayload(response)).toEqual({
      data: [{ id: 1 }, { id: 2 }],
      pagination: { page: 1, limit: 50, total: 2, total_pages: 1 },
    });
  });

  it("acepta arrays directos (legacy) y devuelve pagination null", () => {
    const response = { data: [{ a: 1 }, { b: 2 }] };
    expect(extractListPayload(response)).toEqual({
      data: [{ a: 1 }, { b: 2 }],
      pagination: null,
    });
  });

  it("devuelve { data: [], pagination: null } cuando no hay body", () => {
    expect(extractListPayload(undefined)).toEqual({ data: [], pagination: null });
    expect(extractListPayload(null)).toEqual({ data: [], pagination: null });
    expect(extractListPayload({})).toEqual({ data: [], pagination: null });
  });

  it("preserva pagination null cuando viene { data: [...] } sin pagination", () => {
    const response = { data: { data: [{ id: 1 }] } };
    expect(extractListPayload(response)).toEqual({
      data: [{ id: 1 }],
      pagination: null,
    });
  });
});

describe("extractApiError", () => {
  it("devuelve el mensaje del backend si existe", () => {
    const error = { response: { data: { error: "Cliente no encontrado" } } };
    expect(extractApiError(error, "fallback")).toBe("Cliente no encontrado");
  });

  it("devuelve el fallback cuando no hay response.data.error", () => {
    expect(extractApiError({}, "fallback")).toBe("fallback");
    expect(extractApiError({ response: {} }, "fallback")).toBe("fallback");
    expect(extractApiError(null, "fallback")).toBe("fallback");
  });

  it("devuelve el fallback cuando error es undefined", () => {
    expect(extractApiError(undefined, "msg X")).toBe("msg X");
  });
});
