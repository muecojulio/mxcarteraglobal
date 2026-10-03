"use client";
export function AssetProfile({
  name,
  assetType,
  industry,
  exchange,
}: {
  name: string;
  assetType?: string;
  industry?: string;
  exchange?: string;
}) {
  const title = assetType === "fibra" ? "FIBRA" : assetType === "etf" ? "ETF" : "Empresa";
  return (
    <section className="bg-card rounded-xl border border-border p-4 mb-4">
      <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">{title}</h2>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between gap-2"><span className="text-muted">Nombre</span><span className="font-medium text-right">{name}</span></div>
        {industry ? <div className="flex justify-between gap-2"><span className="text-muted">Sector</span><span className="font-medium text-right">{industry}</span></div> : null}
        {exchange ? <div className="flex justify-between gap-2"><span className="text-muted">Bolsa</span><span className="font-medium text-right">{exchange}</span></div> : null}
      </div>
    </section>
  );
}
export function AssetDisclaimer() {
  return (
    <p className="text-[11px] text-muted text-center leading-relaxed">
      Datos: Finnhub, FMP, Yahoo y DataBursatil según el símbolo. Pueden tener retraso. No es asesoramiento financiero.
    </p>
  );
}
