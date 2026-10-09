"use client";

/**
 * Cinta bursátil infinita (marquee). Idea adaptada del componente `Marquee`
 * del repositorio público magicuidesign/magicui: dos copias idénticas del
 * contenido se desplazan en bucle con `translateX(-50%)`, pausa al pasar el
 * cursor y, con `prefers-reduced-motion`, se convierte en un carril
 * desplazable estático (ver globals.css).
 *
 * Es un duplicado decorativo de datos ya visibles en pantalla, por eso el
 * carril completo va marcado `aria-hidden`.
 */

export type TickerItem = {
  symbol: string;
  price: string;
  changePercent: number;
  flag?: string;
};

function TickerGroup({ items, hidden }: { items: TickerItem[]; hidden: boolean }) {
  return (
    <div className="ui-ticker__group" aria-hidden={hidden || undefined}>
      {items.map((item, i) => {
        const up = item.changePercent >= 0;
        return (
          <span className="ui-ticker__item" key={`${item.symbol}-${i}`}>
            {item.flag ? (
              <span className="ui-ticker__flag" aria-hidden="true">
                {item.flag}
              </span>
            ) : null}
            <span className="ui-ticker__symbol">{item.symbol}</span>
            <span className="ui-ticker__price">{item.price}</span>
            <span className={`ui-ticker__chg ${up ? "is-up" : "is-down"}`}>
              <span className="ui-ticker__arrow" aria-hidden="true">
                {up ? "▲" : "▼"}
              </span>
              {`${up ? "+" : ""}${item.changePercent.toFixed(2)}%`}
            </span>
          </span>
        );
      })}
    </div>
  );
}

export function TickerTape({ items }: { items: TickerItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="ui-ticker">
      <div className="ui-ticker__track" aria-hidden="true">
        <TickerGroup items={items} hidden={false} />
        <TickerGroup items={items} hidden={true} />
      </div>
    </div>
  );
}
