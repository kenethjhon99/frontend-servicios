import { AuthProvider } from "./context/AuthContext";
import { I18nProvider } from "./context/I18nContext";
import { ToastProvider } from "./context/ToastContext";
import AppRouter from "./routes/AppRouter";

function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </ToastProvider>
    </I18nProvider>
  );
}

export default App;
