import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./context/AuthProvider";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { Toaster } from "sonner";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <ErrorBoundary>
        <App />
        <Toaster richColors closeButton position="top-right" />
      </ErrorBoundary>
    </AuthProvider>
  </React.StrictMode>
);
