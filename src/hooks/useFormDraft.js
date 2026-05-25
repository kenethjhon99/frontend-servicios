import { useEffect, useMemo, useRef, useState } from "react";

const DRAFT_NAMESPACE = "svc-maint:draft";

const parseDraft = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const normalizeScope = (userScope) => {
  const value = String(userScope || "guest").trim().toLowerCase();
  return value.replace(/[^a-z0-9@._-]+/g, "-") || "guest";
};

export const resolveDraftStorageKey = ({ storageKey, userScope }) => {
  return `${DRAFT_NAMESPACE}:${normalizeScope(userScope)}:${storageKey}`;
};

export const listDraftSnapshots = ({ userScope } = {}) => {
  if (typeof window === "undefined") {
    return [];
  }

  const prefix = `${DRAFT_NAMESPACE}:${normalizeScope(userScope)}:`;
  const items = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !key.startsWith(prefix)) {
      continue;
    }

    const stored = parseDraft(window.localStorage.getItem(key));
    if (!stored?.savedAt) {
      continue;
    }

    items.push({
      scopedKey: key,
      storageKey: key.slice(prefix.length),
      savedAt: stored.savedAt,
      values: stored.values || {},
    });
  }

  return items.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
};

const formatSavedAt = (isoValue) => {
  if (!isoValue) return "";
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

export const useFormDraft = ({
  storageKey,
  values,
  enabled = true,
  userScope = "guest",
  delayMs = 450,
}) => {
  const timeoutRef = useRef(null);
  const resolvedStorageKey = useMemo(
    () => resolveDraftStorageKey({ storageKey, userScope }),
    [storageKey, userScope]
  );
  const serializedValues = useMemo(() => JSON.stringify(values), [values]);
  const [draftMeta, setDraftMeta] = useState(() => {
    if (!enabled || typeof window === "undefined") {
      return { hasDraft: false, lastSavedAt: "" };
    }

    const stored = parseDraft(window.localStorage.getItem(resolvedStorageKey));
    return {
      hasDraft: Boolean(stored),
      lastSavedAt: stored?.savedAt || "",
    };
  });

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      setDraftMeta({ hasDraft: false, lastSavedAt: "" });
      return undefined;
    }

    const existingDraft = parseDraft(window.localStorage.getItem(resolvedStorageKey));
    setDraftMeta({
      hasDraft: Boolean(existingDraft),
      lastSavedAt: existingDraft?.savedAt || "",
    });
  }, [enabled, resolvedStorageKey]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return undefined;
    }

    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      window.localStorage.setItem(
        resolvedStorageKey,
        JSON.stringify({
          savedAt,
          values: JSON.parse(serializedValues),
        })
      );
      setDraftMeta({ hasDraft: true, lastSavedAt: savedAt });
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutRef.current);
    };
  }, [delayMs, enabled, resolvedStorageKey, serializedValues]);

  const restoreDraft = (onRestore) => {
    if (!enabled || typeof window === "undefined") return false;
    const stored = parseDraft(window.localStorage.getItem(resolvedStorageKey));
    if (!stored?.values) return false;
    onRestore?.(stored.values);
    setDraftMeta({
      hasDraft: true,
      lastSavedAt: stored.savedAt || "",
    });
    return true;
  };

  const clearDraft = () => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(resolvedStorageKey);
    setDraftMeta({ hasDraft: false, lastSavedAt: "" });
  };

  return useMemo(
    () => ({
      hasDraft: draftMeta.hasDraft,
      lastSavedAt: draftMeta.lastSavedAt,
      lastSavedLabel: formatSavedAt(draftMeta.lastSavedAt),
      restoreDraft,
      clearDraft,
    }),
    [draftMeta]
  );
};
