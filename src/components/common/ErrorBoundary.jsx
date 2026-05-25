import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error("UI boundary captured an error", error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
        <section
          className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm"
          role="alert"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-red-600">Error de interfaz</p>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">Algo salio mal</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            La pantalla no pudo cargarse correctamente. Puedes intentar recargar la aplicacion para continuar.
          </p>
          <button
            className="mt-6 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            type="button"
            onClick={this.handleReload}
          >
            Recargar
          </button>
        </section>
      </main>
    );
  }
}

export default ErrorBoundary;
