export default function TerminosPage() {
  return (
    <div className="flex flex-col min-h-full">
      <header className="app-header safe-top">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto">
          <h1 className="text-lg font-bold">Términos de uso</h1>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 text-sm leading-relaxed space-y-3 text-muted stagger">
        <p className="text-foreground font-medium">MX Cartera Global</p>
        <p>Al usar esta aplicación aceptas que es una herramienta informativa de seguimiento de mercados (México, SIC, EE.UU. y otros). No constituye oferta de valores ni intermediación bursátil.</p>
        <p>Los precios, dividendos, calendarios y rangos pueden tener retraso, errores u omisiones. Provienen de terceros (APIs).</p>
        <p>La clave, el código de recuperación, watchlist y cartera se guardan en tu dispositivo salvo que más adelante actives una cuenta en servidor.</p>
        <p>Queda prohibido presentar esta app con el nombre o marcas de terceros, copiar identidades ajenas o usar los datos para revender feeds sin licencia del proveedor.</p>
        <p className="text-xs">Última actualización: agosto 2026. Documento orientativo; no sustituye dictamen de un abogado.</p>
      </main>
    </div>
  );
}
