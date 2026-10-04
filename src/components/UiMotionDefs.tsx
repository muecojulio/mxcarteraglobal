/**
 * Filtros SVG que alimentan las microinteracciones globales.
 * Se montan una sola vez en el layout y el CSS los invoca con `url(#ui-goo)`.
 * No renderizan nada visible (0×0, aria-hidden).
 */
export function UiMotionDefs() {
  return (
    <svg className="ui-motion-defs" aria-hidden="true" focusable="false" width="0" height="0" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      <defs>
        {/* Membrana líquida: blur + matriz alfa (el "goo" del interruptor). */}
        <filter id="ui-goo" x="-55%" y="-75%" width="210%" height="250%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.4" result="softened" />
          <feColorMatrix
            in="softened"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -8"
            result="liquid"
          />
          <feComposite in="SourceGraphic" in2="liquid" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
}
