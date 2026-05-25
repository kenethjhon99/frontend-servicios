/**
 * Sanitiza URLs antes de usarlas en `<a href>` o `<img src>`.
 *
 * Devuelve la URL si es http(s) válida, o null si no es segura.
 * El backend ya valida al guardar, pero blindamos también el render
 * para defensa en profundidad y para datos legacy que pudieron entrar
 * antes de la validación.
 *
 * Usar:
 *   <a href={safeUrl(item.archivo_url) || "#"} ...>
 *   {safeUrl(item.archivo_url) && <img src={safeUrl(item.archivo_url)} />}
 */
export const safeUrl = (raw) => {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (!/^https?:\/\//i.test(trimmed)) return null;

  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
};
