import { createContext, useContext } from "react";
import { translations } from "../i18n/translations";

export const I18nContext = createContext(null);

const resolveFallback = (key) =>
  key.split(".").reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), translations.es) ?? key;

const fallbackI18n = {
  locale: "es",
  setLocale: () => {},
  toggleLocale: () => {},
  t: (key, values = {}) =>
    String(resolveFallback(key)).replace(/\{(\w+)\}/g, (_, token) => values[token] ?? ""),
};

export const useI18n = () =>
  useContext(I18nContext) || fallbackI18n;
