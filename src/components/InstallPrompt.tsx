"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Platform = "ios" | "android" | "desktop" | "other";

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "other";
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as MacIntel with touch
  const isIpad =
    /iPad/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isIphone = /iPhone|iPod/.test(ua);
  if (isIpad || isIphone) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Windows|Macintosh|Linux/i.test(ua)) return "desktop";
  return "other";
}

function isInStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    // @ts-expect-error iOS Safari
    window.navigator.standalone === true
  );
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;

    const wasDismissed = localStorage.getItem("mp-install-dismissed");
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    const p = detectPlatform();
    setPlatform(p);

    // Chrome/Edge/Android: native install event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS / iPadOS: no beforeinstallprompt — show Safari guide
    if (p === "ios") {
      const t = setTimeout(() => setShowGuide(true), 2000);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    // Desktop without event yet: still show manual tip after delay
    if (p === "desktop") {
      const t = setTimeout(() => {
        // Only if browser didn't offer native prompt
        setShowGuide(true);
      }, 4000);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // If native prompt arrived, prefer it over generic guide on desktop/android
  useEffect(() => {
    if (deferredPrompt) setShowGuide(false);
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowGuide(false);
    setDeferredPrompt(null);
    localStorage.setItem("mp-install-dismissed", "1");
  };

  if (dismissed || isInStandaloneMode()) return null;

  // Native install button (Android Chrome, desktop Chromium)
  if (deferredPrompt) {
    return (
      <div className="fixed bottom-20 left-3 right-3 z-[60] max-w-lg mx-auto">
        <div className="bg-card border border-border rounded-2xl shadow-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
              MP
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Instalar MX Cartera Global</p>
              <p className="text-xs text-muted mt-0.5">
                Disponible en este dispositivo (Android o computadora). Se abre
                como app, sin barra del navegador.
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-muted text-lg w-7 h-7 flex items-center justify-center flex-shrink-0"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2.5 rounded-2xl border border-border text-sm font-medium"
            >
              Ahora no
            </button>
            <button
              onClick={handleInstallClick}
              className="flex-1 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold active:scale-[0.98]"
            >
              Instalar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!showGuide) return null;

  // iPhone / iPad (Safari)
  if (platform === "ios") {
    return (
      <div className="fixed bottom-20 left-3 right-3 z-[60] max-w-lg mx-auto">
        <div className="bg-card border border-border rounded-2xl shadow-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
              MP
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">
                Instalar en iPhone o iPad
              </p>
              <ol className="text-xs text-muted mt-2 space-y-1.5 list-decimal list-inside">
                <li>
                  Abre esta página en <strong className="text-foreground">Safari</strong>
                </li>
                <li>
                  Pulsa el botón <strong className="text-foreground">Compartir</strong>{" "}
                  (cuadrado con flecha ↑)
                </li>
                <li>
                  Elige <strong className="text-foreground">“Añadir a pantalla de inicio”</strong>
                </li>
                <li>Confirma con <strong className="text-foreground">Añadir</strong></li>
              </ol>
            </div>
            <button
              onClick={handleDismiss}
              className="text-muted text-lg w-7 h-7 flex-shrink-0"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
          <button
            onClick={handleDismiss}
            className="w-full mt-3 py-2.5 rounded-2xl border border-border text-sm font-medium"
          >
            Entendido
          </button>
        </div>
      </div>
    );
  }

  // Desktop manual (Firefox, Safari Mac, etc.)
  if (platform === "desktop") {
    return (
      <div className="fixed bottom-20 left-3 right-3 z-[60] max-w-lg mx-auto">
        <div className="bg-card border border-border rounded-2xl shadow-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
              MP
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Instalar en la computadora</p>
              <ul className="text-xs text-muted mt-2 space-y-1.5">
                <li>
                  <strong className="text-foreground">Chrome / Edge:</strong> icono
                  de instalar en la barra de direcciones, o menú ⋮ → “Instalar
                  MX Cartera Global”
                </li>
                <li>
                  <strong className="text-foreground">Safari (Mac):</strong> Archivo
                  → “Añadir al Dock”
                </li>
              </ul>
            </div>
            <button
              onClick={handleDismiss}
              className="text-muted text-lg w-7 h-7 flex-shrink-0"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
          <button
            onClick={handleDismiss}
            className="w-full mt-3 py-2.5 rounded-2xl border border-border text-sm font-medium"
          >
            Entendido
          </button>
        </div>
      </div>
    );
  }

  // Android without beforeinstallprompt yet
  return (
    <div className="fixed bottom-20 left-3 right-3 z-[60] max-w-lg mx-auto">
      <div className="bg-card border border-border rounded-2xl shadow-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
            MP
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Instalar en Android</p>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              En Chrome: menú ⋮ → <strong className="text-foreground">“Instalar app”</strong> o
              “Añadir a pantalla de inicio”.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted text-lg w-7 h-7 flex-shrink-0"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        <button
          onClick={handleDismiss}
          className="w-full mt-3 py-2.5 rounded-2xl border border-border text-sm font-medium"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
