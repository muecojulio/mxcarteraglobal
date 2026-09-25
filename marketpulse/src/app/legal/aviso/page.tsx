import Link from "next/link";

export default function AvisoPage() {
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center gap-3 px-4 h-14 max-w-lg mx-auto">
          <Link href="/legal" className="text-muted text-sm">‹</Link>
          <h1 className="text-lg font-bold">No somos asesor</h1>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 text-sm leading-relaxed space-y-3 text-muted">
        <p className="text-foreground font-medium">
          MX Cartera Global es seguimiento de precios, no casa de bolsa ni asesoría CNBV.
        </p>
        <p>Puedes perder el capital invertido. Documento orientativo.</p>
      </main>
    </div>
  );
}
