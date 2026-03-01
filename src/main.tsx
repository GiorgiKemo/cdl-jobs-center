import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    sendDefaultPii: true,
  });
}

// Intentional crash for validating Sentry alert -> GitHub issue automation.
if (new URLSearchParams(window.location.search).get("sentry_github_test") === "1") {
  throw new Error("Sentry GitHub integration test error");
}

// Non-destructive Sentry test: ?sentry_test=1 sends a test event without crashing.
if (new URLSearchParams(window.location.search).get("sentry_test") === "1") {
  Sentry.captureException(new Error("Sentry test event — if you see this, Sentry is working"));
  console.info("[Sentry] Test event sent. Check your Sentry dashboard.");
}

createRoot(document.getElementById("root")!).render(<App />);
