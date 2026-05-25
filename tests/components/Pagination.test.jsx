import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Pagination from "../../src/components/common/Pagination";

describe("Pagination", () => {
  it("no renderiza nada cuando pagination es null", () => {
    const { container } = render(<Pagination pagination={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("muestra solo el contador cuando hay 1 sola página", () => {
    render(
      <Pagination
        pagination={{ page: 1, limit: 50, total: 7, total_pages: 1 }}
        onPageChange={() => {}}
      />
    );
    expect(screen.getByText(/7 resultados/i)).toBeInTheDocument();
    // No debería haber botones de navegación cuando hay 1 página
    expect(screen.queryByLabelText(/Página siguiente/i)).not.toBeInTheDocument();
  });

  it("muestra '1 resultado' (singular) cuando total = 1", () => {
    render(
      <Pagination
        pagination={{ page: 1, limit: 50, total: 1, total_pages: 1 }}
        onPageChange={() => {}}
      />
    );
    expect(screen.getByText(/1 resultado$/i)).toBeInTheDocument();
  });

  it("renderiza botones de navegación cuando hay múltiples páginas", () => {
    render(
      <Pagination
        pagination={{ page: 2, limit: 50, total: 230, total_pages: 5 }}
        onPageChange={() => {}}
      />
    );
    expect(screen.getByLabelText(/Primera página/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Página anterior/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Página siguiente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Última página/i)).toBeInTheDocument();
    expect(screen.getByText(/Página/)).toHaveTextContent(/Página\s*2\s*de\s*5/);
  });

  it("muestra el rango 'desde-hasta de total' correcto", () => {
    render(
      <Pagination
        pagination={{ page: 3, limit: 20, total: 75, total_pages: 4 }}
        onPageChange={() => {}}
      />
    );
    // page 3 con limit 20 → 41-60
    expect(screen.getByText(/41/)).toBeInTheDocument();
    expect(screen.getByText(/60/)).toBeInTheDocument();
    expect(screen.getByText(/75/)).toBeInTheDocument();
  });

  it("topa 'hasta' al total cuando es la última página parcial", () => {
    const { container } = render(
      <Pagination
        pagination={{ page: 4, limit: 20, total: 75, total_pages: 4 }}
        onPageChange={() => {}}
      />
    );
    // page 4 limit 20 → desde 61, hasta min(80, 75) = 75; total = 75
    // Ambos hasta y total son 75; verificamos por la presencia de '61' y '75'
    // en cualquier <strong>.
    const strongs = container.querySelectorAll("strong");
    const values = Array.from(strongs).map((el) => el.textContent);
    expect(values).toContain("61");
    expect(values).toContain("75"); // hasta
    expect(values.filter((v) => v === "75")).toHaveLength(2); // hasta + total
  });

  it("invoca onPageChange con la página siguiente al hacer click", async () => {
    const onPageChange = vi.fn();
    render(
      <Pagination
        pagination={{ page: 2, limit: 50, total: 230, total_pages: 5 }}
        onPageChange={onPageChange}
      />
    );

    await userEvent.click(screen.getByLabelText(/Página siguiente/i));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("invoca onPageChange con 1 al hacer click en 'Primera página'", async () => {
    const onPageChange = vi.fn();
    render(
      <Pagination
        pagination={{ page: 4, limit: 50, total: 230, total_pages: 5 }}
        onPageChange={onPageChange}
      />
    );

    await userEvent.click(screen.getByLabelText(/Primera página/i));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("invoca onPageChange con total_pages al hacer click en 'Última página'", async () => {
    const onPageChange = vi.fn();
    render(
      <Pagination
        pagination={{ page: 1, limit: 50, total: 230, total_pages: 5 }}
        onPageChange={onPageChange}
      />
    );

    await userEvent.click(screen.getByLabelText(/Última página/i));
    expect(onPageChange).toHaveBeenCalledWith(5);
  });

  it("deshabilita 'Primera' y 'Anterior' cuando page === 1", () => {
    render(
      <Pagination
        pagination={{ page: 1, limit: 50, total: 230, total_pages: 5 }}
        onPageChange={() => {}}
      />
    );

    expect(screen.getByLabelText(/Primera página/i)).toBeDisabled();
    expect(screen.getByLabelText(/Página anterior/i)).toBeDisabled();
    expect(screen.getByLabelText(/Página siguiente/i)).not.toBeDisabled();
    expect(screen.getByLabelText(/Última página/i)).not.toBeDisabled();
  });

  it("deshabilita 'Siguiente' y 'Última' en la última página", () => {
    render(
      <Pagination
        pagination={{ page: 5, limit: 50, total: 230, total_pages: 5 }}
        onPageChange={() => {}}
      />
    );

    expect(screen.getByLabelText(/Página siguiente/i)).toBeDisabled();
    expect(screen.getByLabelText(/Última página/i)).toBeDisabled();
  });

  it("ignora clicks en una página fuera de rango (no llama onPageChange)", async () => {
    const onPageChange = vi.fn();
    render(
      <Pagination
        pagination={{ page: 1, limit: 50, total: 230, total_pages: 5 }}
        onPageChange={onPageChange}
      />
    );

    // Click en 'Anterior' (que está deshabilitado): no debería disparar
    const prev = screen.getByLabelText(/Página anterior/i);
    await userEvent.click(prev);
    expect(onPageChange).not.toHaveBeenCalled();
  });
});
