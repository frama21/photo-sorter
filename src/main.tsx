import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@/assets/styles/globals.css"
import { ThemeProvider } from "@/components/ThemeProvider"
import ErrorBoundary from "@/components/ErrorBoundary"
import App from "./App.tsx"

// This is a single-view app with no routes. Normalize any deep link or tampered
// URL (e.g. /admin, /foo/bar) back to "/" so the app only ever runs at its root.
if (window.location.pathname !== "/") {
  window.history.replaceState(null, "", "/")
}

// Register the PWA service worker. The generated SW uses skipWaiting +
// clientsClaim (registerType: "autoUpdate"), so it self-updates on reload.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(err => {
      console.error("[PWA] Service worker registration failed:", err)
    })
  })
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>
)
