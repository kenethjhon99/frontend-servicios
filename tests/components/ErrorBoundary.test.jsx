import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ErrorBoundary from "../../src/components/common/ErrorBoundary";

const BrokenComponent = () => {
  throw new Error("boom");
};

describe("ErrorBoundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("muestra una pantalla recuperable cuando un hijo falla", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/Algo salio mal/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Recargar/i })).toBeInTheDocument();
  });

  it("permite recargar la aplicacion desde el fallback", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const reloadMock = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload: reloadMock });

    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );

    await userEvent.click(screen.getByRole("button", { name: /Recargar/i }));

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
