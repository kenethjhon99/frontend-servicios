import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../src/context/ToastContext";
import { useToast } from "../../src/context/toast.context";

const TriggerButton = ({ type, message, options }) => {
  const toast = useToast();
  return <button onClick={() => toast[type](message, options)}>disparar {type}</button>;
};

const renderWithToast = (children) => render(<ToastProvider>{children}</ToastProvider>);

describe("ToastProvider + useToast - comportamiento basico", () => {
  it("muestra un toast tipo success al llamar toast.success(...)", async () => {
    renderWithToast(<TriggerButton type="success" message="Guardado!" />);

    await userEvent.click(screen.getByText(/disparar success/i));

    expect(screen.getByText("Guardado!")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveClass("bg-green-600");
  });

  it("muestra un toast tipo error con clase roja", async () => {
    renderWithToast(<TriggerButton type="error" message="Fallo!" />);

    await userEvent.click(screen.getByText(/disparar error/i));

    expect(screen.getByText("Fallo!")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveClass("bg-red-600");
  });

  it("muestra un toast tipo warning con clase amarilla", async () => {
    renderWithToast(<TriggerButton type="warning" message="Cuidado" />);

    await userEvent.click(screen.getByText(/disparar warning/i));

    expect(screen.getByRole("status")).toHaveClass("bg-yellow-500");
  });

  it("permite descartar manualmente con el boton de cierre", async () => {
    renderWithToast(<TriggerButton type="info" message="Persistente" />);

    await userEvent.click(screen.getByText(/disparar info/i));
    expect(screen.getByText("Persistente")).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText(/Cerrar notific/i));
    expect(screen.queryByText("Persistente")).not.toBeInTheDocument();
  });

  it("apila multiples toasts simultaneos", async () => {
    renderWithToast(
      <>
        <TriggerButton type="success" message="A" />
        <TriggerButton type="error" message="B" />
        <TriggerButton type="info" message="C" />
      </>
    );

    await userEvent.click(screen.getByText(/disparar success/i));
    await userEvent.click(screen.getByText(/disparar error/i));
    await userEvent.click(screen.getByText(/disparar info/i));

    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(3);
  });
});

describe("ToastProvider - auto-dismiss", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true, advanceTimeDelta: 20 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("auto-dismiss despues del tiempo default (4s)", async () => {
    renderWithToast(<TriggerButton type="info" message="Hola" />);

    await userEvent.click(screen.getByText(/disparar info/i));
    expect(screen.getByText("Hola")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4001);
    });

    await waitFor(() => {
      expect(screen.queryByText("Hola")).not.toBeInTheDocument();
    });
  });

  it("respeta duration custom", async () => {
    renderWithToast(<TriggerButton type="warning" message="Cuidado" options={{ duration: 1000 }} />);

    await userEvent.click(screen.getByText(/disparar warning/i));
    expect(screen.getByText("Cuidado")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByText("Cuidado")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(600);
    });
    await waitFor(() => {
      expect(screen.queryByText("Cuidado")).not.toBeInTheDocument();
    });
  });
});

describe("useToast fuera de provider", () => {
  it("lanza un error explicativo si se usa sin ToastProvider", () => {
    const Bare = () => {
      useToast();
      return null;
    };
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Bare />)).toThrow(/useToast debe usarse dentro/i);
    consoleErrorSpy.mockRestore();
  });
});
