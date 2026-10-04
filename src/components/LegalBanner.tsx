"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
const KEY = "mxcg_legal_ok";
export default function LegalBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setShow(localStorage.getItem(KEY) !== "1"));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  if (!show) return null;
  return (
    <div className="fixed bottom-20 inset-x-0 z-40 px-4">
      <div className="max-w-lg mx-auto bg-card border border-border rounded-2xl p-3 text-xs space-y-2">
        <p>MX Cartera Global no es casa de bolsa ni asesoría. Puedes perder dinero.</p>
        <div className="flex gap-2">
          <Link href="/legal" className="ui-text-action underline">Leer avisos</Link>
          <button type="button" className="ui-btn ui-btn-primary ml-auto text-xs min-h-11" onClick={() => { localStorage.setItem(KEY, "1"); setShow(false); }}>Entendido</button>
        </div>
      </div>
    </div>
  );
}
