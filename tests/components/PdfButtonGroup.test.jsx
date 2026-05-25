import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import PdfButtonGroup from "../../src/components/common/PdfButtonGroup";

describe("PdfButtonGroup", () => {
  it("dispara abrir, imprimir y forzar idiomas", async () => {
    const onDownload = vi.fn();

    render(<PdfButtonGroup label="Recibo" onDownload={onDownload} />);

    await userEvent.click(screen.getByRole("button", { name: /PDF Recibo|PDF Receipt/i }));
    expect(onDownload).toHaveBeenNthCalledWith(1);

    await userEvent.click(screen.getByRole("button", { name: /Imprimir|Print/i }));
    expect(onDownload).toHaveBeenNthCalledWith(2, { mode: "print" });

    await userEvent.click(screen.getByRole("button", { name: "ES" }));
    expect(onDownload).toHaveBeenNthCalledWith(3, { lang: "es" });

    await userEvent.click(screen.getByRole("button", { name: "EN" }));
    expect(onDownload).toHaveBeenNthCalledWith(4, { lang: "en" });
  });
});
