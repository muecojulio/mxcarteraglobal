"use client";
import { useState } from "react";
export default function SettingsPage() {
  const [on, setOn] = useState(false);
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto"><h1 className="text-lg font-bold">Configuración</h1></div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        <div className="flex items-center justify-between ui-row bg-card border border-border">
          <span className="text-sm font-medium">Tema compacto</span>
          <button type="button" className="ui-switch" role="switch" aria-checked={on} onClick={() => setOn((v) => !v)}>
            <span className="ui-switch-track"><span className="ui-switch-thumb" /></span>
          </button>
        </div>
        <a href="/legal/privacidad" className="block text-sm underline">Aviso de privacidad</a>
      </main>
    </div>
  );
}
