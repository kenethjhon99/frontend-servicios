import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useState } from "react";
import {
  listDraftSnapshots,
  resolveDraftStorageKey,
  useFormDraft,
} from "../../src/hooks/useFormDraft";

const DraftHarness = () => {
  const [value, setValue] = useState("inicio");
  const draft = useFormDraft({
    storageKey: "test-draft-form",
    userScope: "demo-user",
    delayMs: 5000,
    values: { value },
  });

  return (
    <div>
      <input aria-label="campo" value={value} onChange={(e) => setValue(e.target.value)} />
      <button
        type="button"
        onClick={() =>
          draft.restoreDraft((snapshot) => {
            setValue(snapshot.value);
          })
        }
      >
        Restaurar
      </button>
      <button type="button" onClick={draft.clearDraft}>
        Limpiar
      </button>
      <span>{draft.hasDraft ? "hay-borrador" : "sin-borrador"}</span>
    </div>
  );
};

describe("useFormDraft", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("guarda y restaura un borrador local", async () => {
    const key = resolveDraftStorageKey({
      storageKey: "test-draft-form",
      userScope: "demo-user",
    });
    window.localStorage.setItem(
      key,
      JSON.stringify({
        savedAt: new Date().toISOString(),
        values: { value: "avance" },
      })
    );

    const view = render(<DraftHarness />);

    view.unmount();
    render(<DraftHarness />);

    await userEvent.click(screen.getByRole("button", { name: /Restaurar/i }));

    await waitFor(() => expect(screen.getByLabelText("campo")).toHaveValue("avance"));
  });

  it("lista borradores por usuario sin mezclar otros alcances", async () => {
    const ownKey = resolveDraftStorageKey({
      storageKey: "test-draft-form",
      userScope: "demo-user",
    });
    window.localStorage.setItem(
      ownKey,
      JSON.stringify({
        savedAt: new Date().toISOString(),
        values: { value: "solo-demo" },
      })
    );
    window.localStorage.setItem(
      "svc-maint:draft:otro-usuario:test-draft-form",
      JSON.stringify({
        savedAt: new Date().toISOString(),
        values: { value: "externo" },
      })
    );

    render(<DraftHarness />);

    await waitFor(() => {
      const drafts = listDraftSnapshots({ userScope: "demo-user" });
      expect(drafts).toHaveLength(1);
      expect(drafts[0].values.value).toBe("solo-demo");
    });
  });
});
