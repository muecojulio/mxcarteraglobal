export default function PrivacidadPage() {
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto">
          <h1 className="text-lg font-bold">Aviso de privacidad</h1>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 text-sm leading-relaxed space-y-3 text-muted">
        <p>
          En esta versión, la cartera, watchlist, clave y contactos de
          recuperación se almacenan <span className="text-foreground">en tu dispositivo</span> (localStorage).
          No operamos una base de usuarios en la nube.
        </p>
        <p>
          Al consultar precios, tu dispositivo o nuestro servidor de Vercel
          puede pedir datos a proveedores (Finnhub, FMP, Yahoo, etc.). Esas
          empresas tienen sus propias políticas.
        </p>
        <p>
          El correo y el celular que registres para recuperación se guardan
          localmente. Hoy no se envían SMS ni correos automáticos.
        </p>
        <p>
          Si más adelante hay cuentas o pagos, se actualizará este aviso
          (ARCO / LFPDPPP en México).
        </p>
        <p className="text-xs">Documento orientativo. No es un aviso corporativo notariado.</p>
      </main>
    </div>
  );
}
