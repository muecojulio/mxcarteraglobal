export default function InstallPage() {
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto">
          <h1 className="text-lg font-bold">Instalar / QR</h1>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 text-sm space-y-3">
        <p>Abre esta app en Safari o Chrome y añádela a la pantalla de inicio.</p>
        <p className="text-muted">Requiere HTTPS (Vercel). No somos casa de bolsa ni asesoría.</p>
      </main>
    </div>
  );
}
