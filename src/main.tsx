import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    sendDefaultPii: true,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  });
}

// Intentional crash for validating Sentry alert -> GitHub issue automation.
if (new URLSearchParams(window.location.search).get("sentry_github_test") === "1") {
  throw new Error("Sentry GitHub integration test error");
}

createRoot(document.getElementById("root")!).render(<App />);
