import Link from "next/link";

export default function LegalIndexPage() {
  return (
    <div className="flex flex-col min-h-full">
      <header className="app-header safe-top">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto">
          <h1 className="text-lg font-bold">Avisos legales</h1>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3 stagger">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs leading-relaxed text-foreground">
          <p className="font-semibold mb-1">MX Cartera Global no es asesoría</p>
          <p className="text-muted">
            No somos casa de bolsa, no estamos autorizados por la CNBV como
            asesores y no ejecutamos órdenes. La información es orientativa; puedes
            perder dinero. Confirma con tu intermediario y contador.
          </p>
        </div>
        <Link href="/legal/aviso" className="block bg-card border border-border rounded-2xl px-4 py-4 font-medium text-sm">
          Aviso de no asesoría
        </Link>
        <Link href="/legal/terminos" className="block bg-card border border-border rounded-2xl px-4 py-4 font-medium text-sm">
          Términos de uso
        </Link>
        <Link href="/legal/privacidad" className="block bg-card border border-border rounded-2xl px-4 py-4 font-medium text-sm">
          Aviso de privacidad
        </Link>
      </main>
    </div>
  );
}
