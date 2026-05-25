import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/auth.context";
import { useI18n } from "../../context/i18n.context";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useI18n();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(form);
      navigate("/");
    } catch (err) {
      setError(err?.response?.data?.error || t("login.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.18),transparent_30%)]" />

      <div className="relative grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="surface-card hidden rounded-[2rem] bg-slate-900 p-8 text-white lg:flex lg:flex-col lg:justify-between xl:p-10">
          <div>
            <p className="text-sm uppercase tracking-[0.32em] text-sky-200">{t("app.name")}</p>
            <h1 className="mt-4 max-w-lg text-4xl font-semibold leading-tight xl:text-5xl">
              {t("login.heroTitle")}
            </h1>
            <p className="mt-5 max-w-xl text-base text-slate-300 xl:text-lg">
              {t("login.heroDescription")}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-300">{t("login.heroOps")}</p>
              <p className="mt-2 text-lg font-semibold">{t("login.heroOpsValue")}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-300">{t("login.heroFinance")}</p>
              <p className="mt-2 text-lg font-semibold">{t("login.heroFinanceValue")}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-300">{t("login.heroClients")}</p>
              <p className="mt-2 text-lg font-semibold">{t("login.heroClientsValue")}</p>
            </div>
          </div>
        </section>

        <section className="surface-card rounded-[2rem] bg-white p-6 sm:p-8 lg:p-10">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.26em] text-sky-600">
                {t("login.eyebrow")}
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                {t("login.title")}
              </h2>
              <p className="mt-3 text-base text-slate-500 sm:text-lg">
                {t("login.description")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-600 sm:text-base">
                  {t("login.username")}
                </span>
                <input
                  type="text"
                  name="username"
                  placeholder={t("login.usernamePlaceholder")}
                  value={form.username}
                  onChange={handleChange}
                  className="w-full rounded-2xl border px-4 py-3.5 text-base outline-none sm:text-lg"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-600 sm:text-base">
                  {t("login.password")}
                </span>
                <input
                  type="password"
                  name="password"
                  placeholder={t("login.passwordPlaceholder")}
                  value={form.password}
                  onChange={handleChange}
                  className="w-full rounded-2xl border px-4 py-3.5 text-base outline-none sm:text-lg"
                />
              </label>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 sm:text-base">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-slate-900 px-4 py-4 text-base font-semibold text-white shadow-lg disabled:opacity-60 sm:text-lg"
              >
                {loading ? t("login.submitting") : t("login.submit")}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LoginPage;
