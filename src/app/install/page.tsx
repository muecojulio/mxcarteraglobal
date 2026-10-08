"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

type Platform = "ios" | "android" | "desktop" | "other";

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "other";
  const ua = navigator.userAgent;
  const isIpad =
    /iPad/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIpad || /iPhone|iPod/.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Windows|Macintosh|Linux/i.test(ua)) return "desktop";
  return "other";
}

export default function InstallPage() {
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<Platform>("other");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(window.location.origin);
    setPlatform(detectPlatform());
  }, []);

  const qrSrc = useMemo(() => {
    if (!url) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(
      url
    )}`;
  }, [url]);

  const copyLink = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Copia este enlace:\n" + url);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border safe-top">
        <div className="flex items-center gap-3 px-4 h-14 max-w-lg mx-auto">
          <Link href="/more" className="text-primary text-sm font-medium">
            ← Más
          </Link>
          <h1 className="text-lg font-bold">Instalar MX Cartera Global</h1>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-6 pb-28">
        <section className="text-center space-y-2">
          <p className="text-2xl font-bold">Tu app en cualquier dispositivo</p>
          <p className="text-sm text-muted leading-relaxed">
            iPhone · iPad · tablet · Android · computadora
          </p>
        </section>

        {/* QR */}
        <section className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center gap-4 shadow-sm">
          <p className="text-sm font-semibold">Código QR</p>
          {qrSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrSrc}
              alt="Código QR de MX Cartera Global"
              width={280}
              height={280}
              className="rounded-xl bg-white p-2"
            />
          ) : (
            <div className="w-[280px] h-[280px] rounded-xl bg-secondary animate-pulse" />
          )}
          <p className="text-xs text-muted text-center leading-relaxed">
            Escanea con la cámara del celular o tablet para abrir MX Cartera Global
          </p>
        </section>

        {/* Link */}
        <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">
            Enlace directo
          </p>
          <p className="text-sm break-all font-mono bg-secondary/80 rounded-xl px-3 py-3">
            {url || "…"}
          </p>
          <button
            type="button"
            onClick={copyLink}
            className="w-full min-h-[52px] rounded-full bg-primary text-primary-foreground font-semibold text-base"
          >
            {copied ? "¡Copiado!" : "Copiar enlace"}
          </button>
        </section>

        {/* iPhone / iPad */}
        <section className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <h2 className="font-semibold text-base">iPhone e iPad</h2>
          <ol className="text-sm text-muted space-y-2 list-decimal list-inside leading-relaxed">
            <li>Abre este enlace en <strong className="text-foreground">Safari</strong></li>
            <li>Toca el botón <strong className="text-foreground">Compartir</strong> (cuadrado con flecha)</li>
            <li>Elige <strong className="text-foreground">Añadir a pantalla de inicio</strong></li>
            <li>Confirma el nombre <strong className="text-foreground">MX Cartera Global</strong></li>
          </ol>
          {platform === "ios" && (
            <p className="text-xs text-success font-medium pt-1">
              Parece que ya estás en un dispositivo Apple — sigue los pasos de arriba.
            </p>
          )}
        </section>

        {/* Android */}
        <section className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <h2 className="font-semibold text-base">Android (celular o tablet)</h2>
          <ol className="text-sm text-muted space-y-2 list-decimal list-inside leading-relaxed">
            <li>Abre este enlace en <strong className="text-foreground">Chrome</strong></li>
            <li>Menú <strong className="text-foreground">⋮</strong> (arriba a la derecha)</li>
            <li>
              <strong className="text-foreground">Instalar aplicación</strong> o{" "}
              <strong className="text-foreground">Añadir a pantalla de inicio</strong>
            </li>
          </ol>
          {platform === "android" && (
            <p className="text-xs text-success font-medium pt-1">
              Parece que ya estás en Android — sigue los pasos de arriba.
            </p>
          )}
        </section>

        {/* Desktop */}
        <section className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <h2 className="font-semibold text-base">Computadora</h2>
          <p className="text-sm text-muted leading-relaxed">
            Abre el enlace en Chrome o Edge. Si el navegador lo ofrece, usa{" "}
            <strong className="text-foreground">Instalar MX Cartera Global</strong> para
            tenerla como ventana de app.
          </p>
        </section>

        <p className="text-[11px] text-muted text-center leading-relaxed px-2">
          Esta página solo funciona cuando la app está publicada en internet
          (https). El código QR apunta a tu enlace actual.
        </p>
      </main>
    </div>
  );
}
