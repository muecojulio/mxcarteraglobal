export default function HomePage() {
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto">
          <h1 className="text-lg font-bold">MX Cartera Global</h1>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-3">
        <p className="text-sm text-muted">Seguimiento de mercados. No es asesoría ni casa de bolsa.</p>
        <a href="/legal" className="ui-btn ui-btn-primary">Avisos legales</a>
      </main>
    </div>
  );
}
