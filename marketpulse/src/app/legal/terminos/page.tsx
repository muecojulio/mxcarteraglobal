export default function TerminosPage() {
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto">
          <h1 className="text-lg font-bold">Términos de uso</h1>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 text-sm leading-relaxed space-y-3 text-muted">
        <p className="text-foreground font-medium">MX Cartera Global</p>
        <p>
          Al usar esta aplicación aceptas que es una herramienta informativa
          de seguimiento de mercados. No constituye oferta de valores ni intermediación bursátil.
        </p>
        <p>
          Los precios, dividendos, calendarios y rangos pueden tener retraso,
          errores u omisiones. Provienen de terceros (APIs).
        </p>
        <p>
          La clave, watchlist y cartera se guardan en tu dispositivo salvo que actives una cuenta en servidor.
        </p>
        <p className="text-xs">Última actualización: agosto 2026. Documento orientativo.</p>
      </main>
    </div>
  );
}
