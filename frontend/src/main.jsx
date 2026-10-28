import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { DialogProvider } from "./components/Dialog.jsx";
import "./index.css";

// The free server sleeps when idle: wake it up in the background while the visitor reads the first page
fetch(`${import.meta.env.VITE_API_URL}/health`).catch(() => {});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DialogProvider>
          <App />
        </DialogProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
