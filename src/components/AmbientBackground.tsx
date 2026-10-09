/**
 * Fondo ambiental "aurora": tres manchas de color muy suaves que derivan
 * lentamente detrás del contenido. Idea adaptada del componente
 * `AuroraBackground` del repositorio público magicuidesign/magicui,
 * reimplementada solo con CSS (sin dependencias nuevas).
 *
 * Es puramente decorativo: `aria-hidden`, sin interacción, y con
 * `prefers-reduced-motion` la deriva se detiene (ver globals.css).
 */
export default function AmbientBackground() {
  return (
    <div className="ui-ambient" aria-hidden="true">
      <span className="ui-ambient__blob ui-ambient__blob--a" />
      <span className="ui-ambient__blob ui-ambient__blob--b" />
      <span className="ui-ambient__blob ui-ambient__blob--c" />
    </div>
  );
}
