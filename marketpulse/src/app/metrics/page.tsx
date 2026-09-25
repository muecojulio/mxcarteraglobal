export default function MetricsPage() {
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto"><h1 className="text-lg font-bold">Métricas</h1></div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 text-sm text-muted">Indicadores de seguimiento. Rentabilidades pasadas no garantizan resultados.</main>
    </div>
  );
}
