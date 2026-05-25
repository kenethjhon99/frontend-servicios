import { useEffect, useMemo, useState } from "react";
import { translations } from "../i18n/translations";
import { I18nContext } from "./i18n.context";

const STORAGE_KEY = "codanova-language";
const DEFAULT_LOCALE = "en";
const SUPPORTED = ["en", "es"];

const resolveMessage = (locale, key) => {
  const walk = (source) =>
    key.split(".").reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), source);

  return walk(translations[locale]) ?? walk(translations[DEFAULT_LOCALE]) ?? key;
};

const interpolate = (message, values = {}) =>
  String(message).replace(/\{(\w+)\}/g, (_, token) => values[token] ?? "");

export const I18nProvider = ({ children }) => {
  const [locale, setLocale] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_LOCALE;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return SUPPORTED.includes(saved) ? saved : DEFAULT_LOCALE;
  });

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      toggleLocale: () => setLocale((prev) => (prev === "en" ? "es" : "en")),
      t: (key, values) => interpolate(resolveMessage(locale, key), values),
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
