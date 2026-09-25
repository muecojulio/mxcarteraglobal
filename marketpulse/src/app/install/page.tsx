"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
type Platform = "ios" | "android" | "desktop" | "other";
function detectPlatform(): Platform {
  if (typeof window === "undefined") return "other";
  const ua = navigator.userAgent;
  const isIpad = /iPad/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIpad || /iPhone|iPod/.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Windows|Macintosh|Linux/i.test(ua)) return "desktop";
  return "other";
}
export default function InstallPage() {
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<Platform>("other");
  const [copied, setCopied] = useState(false);
  useEffect(() => { setUrl(window.location.origin); setPlatform(detectPlatform()); }, []);
  const qrSrc = useMemo(() => url ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(url)}` : "", [url]);
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center gap-3 px-4 h-14 max-w-lg mx-auto">
          <Link href="/settings" className="text-primary text-sm">←</Link>
          <h1 className="text-lg font-bold">Instalar MX Cartera Global</h1>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-6">
        <p className="text-sm text-muted text-center">Añade la app a la pantalla de inicio. Enlace: {url || "…"}</p>
        {qrSrc ? <img src={qrSrc} alt="QR de instalación" className="mx-auto rounded-xl border border-border" width={280} height={280} /> : null}
        <button type="button" className="ui-btn ui-btn-primary w-full" onClick={async () => { if (!url) return; try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { alert(url); } }}>{copied ? "Copiado" : "Copiar enlace"}</button>
        {platform === "ios" ? <p className="text-sm">Safari → Compartir → Añadir a pantalla de inicio.</p> : null}
        {platform === "android" ? <p className="text-sm">Chrome → menú → Instalar aplicación.</p> : null}
        {platform === "desktop" ? <p className="text-sm">Abre este enlace en el teléfono y usa el QR.</p> : null}
      </main>
    </div>
  );
}
