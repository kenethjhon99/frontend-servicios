import { useEffect, useState } from "react";
import {
  createEvidenciaRequest,
  deleteEvidenciaRequest,
  getEvidenciasByOrdenRequest,
} from "../../../api/evidencias.api";
import AlertMessage from "../../../components/common/AlertMessage";
import ConfirmModal from "../../../components/common/ConfirmModal";
import EmptyState from "../../../components/common/EmptyState";
import Loader from "../../../components/common/Loader";
import { useI18n } from "../../../context/i18n.context";
import { extractApiError } from "../../../lib/api";
import { safeUrl } from "../../../lib/safeUrl";

const tipos = ["ANTES", "DESPUES", "GENERAL"];

const initialForm = {
  tipo_evidencia: "ANTES",
  archivo_url: "",
  nombre_archivo: "",
  tipo_archivo: "image/jpeg",
  descripcion: "",
  orden_visual: 1,
};

const EvidenciasOrdenSection = ({ idOrden }) => {
  const { t } = useI18n();
  const [evidencias, setEvidencias] = useState([]);
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(initialForm);

  const loadEvidencias = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};
      if (tipoFiltro) params.tipo_evidencia = tipoFiltro;

      const data = await getEvidenciasByOrdenRequest(idOrden, params);
      setEvidencias(data);
    } catch (err) {
      setError(extractApiError(err, t("orderEvidence.loadError")));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (idOrden) loadEvidencias();
  }, [idOrden, tipoFiltro]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setError("");
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();

    if (!form.archivo_url.trim()) {
      setError(t("orderEvidence.requiredUrl"));
      return;
    }

    try {
      setError("");
      await createEvidenciaRequest({
        id_orden_trabajo: idOrden,
        tipo_evidencia: form.tipo_evidencia,
        archivo_url: form.archivo_url,
        nombre_archivo: form.nombre_archivo || null,
        tipo_archivo: form.tipo_archivo || null,
        descripcion: form.descripcion || null,
        orden_visual: Number(form.orden_visual) || 1,
      });

      setForm(initialForm);
      await loadEvidencias();
    } catch (err) {
      setError(extractApiError(err, t("orderEvidence.saveError")));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      setError("");
      await deleteEvidenciaRequest(deleteTarget.id_evidencia);
      setDeleteTarget(null);
      await loadEvidencias();
    } catch (err) {
      setError(extractApiError(err, t("orderEvidence.deleteError")));
    } finally {
      setDeleting(false);
    }
  };

  const agrupadas = tipos.reduce((acc, tipo) => {
    acc[tipo] = evidencias.filter((evidencia) => evidencia.tipo_evidencia === tipo);
    return acc;
  }, {});

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t("orderEvidence.title")}</h2>
          <p className="text-sm text-slate-500">{t("orderEvidence.subtitle")}</p>
        </div>

        <select
          value={tipoFiltro}
          onChange={(event) => setTipoFiltro(event.target.value)}
          className="rounded-xl border bg-white px-4 py-2 text-sm outline-none"
        >
          <option value="">{t("orderEvidence.allTypes")}</option>
          <option value="ANTES">ANTES</option>
          <option value="DESPUES">DESPUES</option>
          <option value="GENERAL">GENERAL</option>
        </select>
      </div>

      <AlertMessage message={error} />

      <form
        onSubmit={handleCreate}
        className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-3"
      >
        <select
          name="tipo_evidencia"
          value={form.tipo_evidencia}
          onChange={handleChange}
          className="rounded-xl border px-4 py-3 outline-none"
        >
          <option value="ANTES">ANTES</option>
          <option value="DESPUES">DESPUES</option>
          <option value="GENERAL">GENERAL</option>
        </select>

        <input
          name="archivo_url"
          value={form.archivo_url}
          onChange={handleChange}
          placeholder={t("orderEvidence.fileUrlPlaceholder")}
          className="rounded-xl border px-4 py-3 outline-none md:col-span-2"
        />

        <input
          name="nombre_archivo"
          value={form.nombre_archivo}
          onChange={handleChange}
          placeholder={t("orderEvidence.fileNamePlaceholder")}
          className="rounded-xl border px-4 py-3 outline-none"
        />

        <input
          name="tipo_archivo"
          value={form.tipo_archivo}
          onChange={handleChange}
          placeholder={t("orderEvidence.fileTypePlaceholder")}
          className="rounded-xl border px-4 py-3 outline-none"
        />

        <input
          name="orden_visual"
          type="number"
          value={form.orden_visual}
          onChange={handleChange}
          placeholder={t("orderEvidence.visualOrderPlaceholder")}
          className="rounded-xl border px-4 py-3 outline-none"
        />

        <textarea
          name="descripcion"
          value={form.descripcion}
          onChange={handleChange}
          placeholder={t("orderEvidence.descriptionPlaceholder")}
          className="rounded-xl border px-4 py-3 outline-none md:col-span-3"
          rows={2}
        />

        <button
          type="submit"
          className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white md:col-span-3"
        >
          {t("orderEvidence.save")}
        </button>
      </form>

      {loading && <Loader text={t("orderEvidence.loading")} />}

      {!loading && !error && evidencias.length === 0 && (
        <EmptyState
          title={t("orderEvidence.emptyTitle")}
          description={t("orderEvidence.emptyDescription")}
        />
      )}

      {!loading && evidencias.length > 0 && (
        <div className="space-y-6">
          {tipos.map((tipo) => {
            const items = tipoFiltro ? evidencias : agrupadas[tipo];

            if (!items?.length) return null;

            return (
              <div key={tipo} className="space-y-3">
                <h3 className="font-semibold">{tipo}</h3>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((evidencia) => {
                    const urlSegura = safeUrl(evidencia.archivo_url);
                    const esImagen = urlSegura && evidencia.tipo_archivo?.startsWith("image");

                    return (
                      <div
                        key={evidencia.id_evidencia}
                        className="overflow-hidden rounded-2xl border bg-white shadow-sm"
                      >
                        {esImagen ? (
                          <img
                            src={urlSegura}
                            alt={
                              evidencia.descripcion ||
                              evidencia.nombre_archivo ||
                              t("orderEvidence.evidenceAlt")
                            }
                            className="h-48 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-48 items-center justify-center bg-slate-100 text-sm text-slate-500">
                            {urlSegura
                              ? t("orderEvidence.fileRegistered")
                              : t("orderEvidence.invalidUrl")}
                          </div>
                        )}

                        <div className="space-y-2 p-4">
                          <div className="flex items-center justify-between">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
                              {evidencia.tipo_evidencia}
                            </span>

                            <span className="text-xs text-slate-400">
                              #{evidencia.orden_visual}
                            </span>
                          </div>

                          <p className="text-sm font-medium">
                            {evidencia.nombre_archivo || t("orderEvidence.unnamedFile")}
                          </p>

                          <p className="text-sm text-slate-500">
                            {evidencia.descripcion || t("orderEvidence.noDescription")}
                          </p>

                          <div className="flex gap-2 pt-2">
                            {urlSegura ? (
                              <a
                                href={urlSegura}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                              >
                                {t("orderEvidence.viewFile")}
                              </a>
                            ) : (
                              <span
                                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700"
                                title={t("orderEvidence.invalidUrlTitle")}
                              >
                                {t("orderEvidence.invalidUrl")}
                              </span>
                            )}

                            <button
                              onClick={() => setDeleteTarget(evidencia)}
                              className="rounded-lg border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                            >
                              {t("orderEvidence.delete")}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title={t("orderEvidence.deleteTitle")}
          message={t("orderEvidence.deleteMessage")}
          confirmLabel={t("orderEvidence.deleteConfirm")}
          loading={deleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </section>
  );
};

export default EvidenciasOrdenSection;
