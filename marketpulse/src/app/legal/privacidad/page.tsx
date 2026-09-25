import Link from "next/link";

export default function PrivacidadPage() {
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto gap-3">
          <Link href="/legal" className="ui-btn ui-btn-ghost text-sm px-3 min-h-12">Atrás</Link>
          <h1 className="text-lg font-bold">Aviso de privacidad</h1>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 text-sm leading-relaxed space-y-4 text-muted">
        <p className="text-xs text-foreground">Borrador informativo para revisión. No sustituye un aviso notariado. Actualizado: 25 de septiembre de 2026.</p>
        <section className="space-y-2">
          <h2 className="text-foreground font-semibold">1. Responsable</h2>
          <p>MX Cartera Global es una aplicación de uso personal. En esta versión no operamos un padrón de usuarios en la nube. El responsable del tratamiento en tu dispositivo eres tú.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-foreground font-semibold">2. Datos que se tratan</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Cartera, watchlist, metas y alertas (localStorage).</li>
            <li>Tema visual y preferencias.</li>
            <li>PIN / bloqueo y WebAuthn si lo activas.</li>
            <li>Correo y celular de recuperación solo en el dispositivo. No se envían SMS ni correos automáticos.</li>
            <li>Caché local de mercado con TTL.</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h2 className="text-foreground font-semibold">3. Finalidades</h2>
          <p>Mostrar cotizaciones, calcular tu cartera en este aparato y reducir llamadas repetidas. No vendemos datos.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-foreground font-semibold">4. Transferencias</h2>
          <p>Al pedir precios, el dispositivo o el servidor puede consultar proveedores (Yahoo, Nasdaq, Finnhub, FMP u otros si hay clave). No enviamos tu cartera a esos proveedores.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-foreground font-semibold">5. Conservación y ARCO</h2>
          <p>Los datos viven en el navegador o PWA hasta que los borres. Si hay cuenta en la nube, se documentarán derechos ARCO (LFPDPPP).</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-foreground font-semibold">6. Menores</h2>
          <p>La app no está dirigida a menores de 18 años.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-foreground font-semibold">7. Seguridad</h2>
          <p>Datos sensibles pueden cifrarse en el dispositivo. No hay base SQL en servidor en esta versión.</p>
        </section>
        <p className="text-xs">Documento orientativo. No es asesoría legal, fiscal ni de inversión.</p>
      </main>
    </div>
  );
}
