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
  const copyLink = async () => {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { alert("Copia este enlace:\n" + url); }
  };
  return (
    <div className="flex flex-col min-h-full">
      <header className="app-header safe-top">
        <div className="flex items-center gap-3 px-4 h-14 max-w-lg mx-auto">
          <Link href="/settings" className="text-primary text-sm font-medium">← Más</Link>
          <h1 className="text-lg font-bold">Instalar MX Cartera Global</h1>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-6 pb-28 stagger">
        <section className="text-center space-y-2">
          <p className="text-2xl font-bold">Tu app en cualquier dispositivo</p>
          <p className="text-sm text-muted">iPhone · iPad · tablet · Android · computadora</p>
        </section>
        <section className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center gap-4">
          <p className="text-sm font-semibold">Código QR</p>
          {qrSrc ? <img src={qrSrc} alt="Código QR de MX Cartera Global" width={280} height={280} className="rounded-xl bg-white p-2" /> : <div className="w-[280px] h-[280px] rounded-xl bg-secondary animate-pulse" />}
          <p className="text-xs text-muted text-center">Escanea con la cámara del celular o tablet</p>
        </section>
        <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-muted uppercase">Enlace directo</p>
          <p className="text-sm break-all font-mono bg-secondary/80 rounded-xl px-3 py-3">{url || "…"}</p>
          <button type="button" onClick={() => void copyLink()} className="ui-btn ui-btn-primary w-full">{copied ? "¡Copiado!" : "Copiar enlace"}</button>
        </section>
        <section className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <h2 className="font-semibold">iPhone e iPad</h2>
          <ol className="text-sm text-muted space-y-2 list-decimal list-inside">
            <li>Abre este enlace en Safari</li>
            <li>Toca Compartir (cuadrado con flecha)</li>
            <li>Añadir a pantalla de inicio</li>
            <li>Confirma el nombre MX Cartera Global</li>
          </ol>
          {platform === "ios" ? <p className="text-xs text-success font-medium">Parece que ya estás en un dispositivo Apple.</p> : null}
        </section>
        <section className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <h2 className="font-semibold">Android</h2>
          <ol className="text-sm text-muted space-y-2 list-decimal list-inside">
            <li>Abre este enlace en Chrome</li>
            <li>Menú ⋮</li>
            <li>Instalar aplicación o Añadir a pantalla de inicio</li>
          </ol>
          {platform === "android" ? <p className="text-xs text-success font-medium">Parece que ya estás en Android.</p> : null}
        </section>
      </main>
    </div>
  );
}
