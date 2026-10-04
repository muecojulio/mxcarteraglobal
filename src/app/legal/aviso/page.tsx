import Link from "next/link";

export default function AvisoPage() {
  return (
    <div className="flex flex-col min-h-full">
      <header className="app-header safe-top">
        <div className="flex items-center gap-3 px-4 h-14 max-w-lg mx-auto">
          <Link href="/legal" className="text-muted text-sm">‹</Link>
          <h1 className="text-lg font-bold">No somos asesor</h1>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 text-sm leading-relaxed space-y-3 text-muted stagger">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-foreground">
          <p className="font-semibold text-sm mb-1">En pocas palabras</p>
          <ul className="text-xs space-y-1.5 list-disc pl-4">
            <li>No somos casa de bolsa ni operamos tu dinero.</li>
            <li>No estamos autorizados por la CNBV como asesores de inversiones.</li>
            <li>No ejecutamos órdenes de compra o venta.</li>
            <li>Nada en la app es una instrucción de comprar, vender o esperar.</li>
            <li>Puedes perder el capital invertido.</li>
          </ul>
        </div>
        <p className="text-foreground font-medium">
          MX Cartera Global es una herramienta de seguimiento de precios, dividendos y métricas (BMV, BIVA, SIC y referencias globales).
        </p>
        <p>
          Las secciones “Contexto de precio”, “Análisis”, “Filtro”, “Métricas” y rebalanceo muestran números y rangos (por ejemplo el de 52 semanas). Eso no constituye recomendación personalizada ni oferta de valores.
        </p>
        <p>
          Los impuestos (ISR, W-8BEN, resultado fiscal y reembolso de capital en FIBRAs) son estimaciones educativas. El desglose oficial de cada distribución lo publica el fiduciario; confirma con tu contador y tu casa de bolsa.
        </p>
        <p>
          Precios y eventos pueden ir retrasados o incompletos según las APIs gratuitas. Rentabilidades pasadas no garantizan resultados futuros.
        </p>
        <p className="text-xs pt-2">Documento orientativo · No sustituye dictamen legal o fiscal · Agosto 2026</p>
      </main>
    </div>
  );
}
