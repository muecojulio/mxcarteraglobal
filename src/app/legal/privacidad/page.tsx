import Link from "next/link";

/**
 * Aviso de privacidad.
 *
 * Alineado con la LFPDPPP (México): responsable, datos tratados, finalidades,
 * transferencias, mecanismos de seguridad, derechos ARCO y procedimiento.
 * Todo lo que se describe aquí se verificó contra el código: no se declara
 * ningún tratamiento que la app no haga realmente.
 */

const CONTACTO_ARCO = "muecojulio@gmail.com";
const ULTIMA_ACTUALIZACION = "8 de octubre de 2026";

const DATOS_LOCALES = [
  ["Watchlist y posiciones de cartera", "marketpulse_watchlist, marketpulse_positions"],
  ["Alertas de precio, metas y proyecciones", "marketpulse_price_alerts, marketpulse_goal, marketpulse_projection, marketpulse_div_goal, marketpulse_div_proj"],
  ["Preferencias (tema, ajustes, última pantalla)", "mxcg_prefs, marketpulse_theme, mxcg_last_route"],
  ["Búsquedas recientes", "mxcg_recent_symbols"],
  ["Cifrado de clave y hash de recuperación", "mxcg_lock_pin_hash, mxcg_lock_recovery_hash"],
  ["Contactos de recuperación que tú registres (correo y celular)", "mxcg_lock_email, mxcg_lock_phone"],
];

const TERCEROS = [
  ["Yahoo Finance", "Precios, histórico, métricas y dividendos", "query1/query2.finance.yahoo.com"],
  ["Nasdaq (endpoints públicos)", "Calendarios, screener y cotizaciones de respaldo", "api.nasdaq.com, www.nasdaq.com"],
  ["SEC EDGAR", "Fundamentales y filings de compañías", "data.sec.gov, efts.sec.gov, www.sec.gov"],
  ["FRED / U.S. Treasury", "Tasa libre de riesgo", "fred.stlouisfed.org, api.fiscaldata.treasury.gov"],
  ["TradingView Scanner", "Cotizaciones de respaldo", "scanner.tradingview.com"],
  ["open.er-api / Frankfurter", "Tipo de cambio USD/MXN de respaldo", "open.er-api.com, api.frankfurter.dev"],
  ["Proveedores con API key (opcionales)", "Solo si el administrador configura la clave: Finnhub, FMP, Polygon/Massive, Finage, Twelve Data, Alpha Vantage, DataBursatil", "finnhub.io, financialmodelingprep.com, api.polygon.io, api.finage.co.uk, api.twelvedata.com, www.alphavantage.co, api.databursatil.com"],
];

export default function PrivacidadPage() {
  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border safe-top">
        <div className="flex items-center gap-3 px-4 h-14 max-w-lg mx-auto">
          <Link href="/legal" className="text-muted text-sm">
            ‹
          </Link>
          <h1 className="text-lg font-bold">Aviso de privacidad</h1>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 text-sm leading-relaxed space-y-4 text-muted">
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-3.5 text-foreground">
          <p className="font-semibold text-sm mb-1">Resumen</p>
          <p className="text-xs">
            Tu cartera nunca sale de tu dispositivo en texto plano. No hay cuentas
            de usuario, no hay analítica, no hay cookies de rastreo y no vendemos
            ni compartimos datos. El respaldo en la nube es opcional y viaja
            cifrado: el servidor no tiene la llave.
          </p>
        </div>

        <section className="space-y-2">
          <h2 className="text-foreground font-semibold">1. Responsable</h2>
          <p>
            El responsable del tratamiento de los datos personales descritos en
            este aviso es el desarrollador y titular de{" "}
            <span className="text-foreground">MX Cartera Global</span>, una
            aplicación web de uso personal distribuida como PWA, alojada en
            Vercel.
          </p>
          <p>
            Contacto para cualquier asunto relacionado con este aviso:{" "}
            <a href={`mailto:${CONTACTO_ARCO}`} className="text-primary break-all">
              {CONTACTO_ARCO}
            </a>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-foreground font-semibold">
            2. Datos personales que tratamos
          </h2>
          <p>
            La aplicación <span className="text-foreground">no solicita</span>{" "}
            registro, nombre, domicilio, CURP, RFC, datos patrimoniales
            verificables ni datos personales sensibles. No operamos una base de
            usuarios en la nube.
          </p>
          <p>
            Los siguientes datos se guardan{" "}
            <span className="text-foreground">
              únicamente en el almacenamiento local de tu dispositivo
            </span>{" "}
            (<code className="text-xs">localStorage</code>):
          </p>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-card text-foreground">
                  <th className="text-left px-3 py-2 font-medium">Dato</th>
                  <th className="text-left px-3 py-2 font-medium">Clave</th>
                </tr>
              </thead>
              <tbody>
                {DATOS_LOCALES.map(([dato, clave]) => (
                  <tr key={clave} className="border-t border-border">
                    <td className="px-3 py-2 align-top">{dato}</td>
                    <td className="px-3 py-2 align-top font-mono text-[10px] break-all">
                      {clave}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs">
            Los elementos marcados como sensibles se guardan cifrados con
            AES-GCM (WebCrypto). La fuerza real depende de si activas la clave
            de acceso:
          </p>
          <ul className="text-xs space-y-1 list-disc pl-5">
            <li>
              <span className="text-foreground">Con clave activada:</span> la
              llave maestra se deriva de tu clave con PBKDF2 (120.000
              iteraciones, SHA-256) y solo se guarda envuelta. Sin tu clave no
              se puede leer la cartera.
            </li>
            <li>
              <span className="text-foreground">Sin clave activada:</span> se usa
              una llave de dispositivo que se guarda en el mismo{" "}
              <code className="text-xs">localStorage</code>. Cifra el contenido,
              pero no es una caja fuerte: alguien con acceso físico a tu
              navegador podría reconstruirla.{" "}
              <span className="text-foreground">
                Activa la clave de acceso en Ajustes si guardas una cartera
                relevante.
              </span>
            </li>
          </ul>
          <p className="text-xs">
            Tu clave nunca se envía a ningún servidor: el cifrado, el hash y la
            verificación ocurren íntegramente en tu navegador.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-foreground font-semibold">
            3. Datos que viajan a servidores
          </h2>
          <p>
            Al consultar precios o abrir la app, tu dispositivo hace peticiones a
            rutas <code className="text-xs">/api/*</code> de esta aplicación, que
            a su vez consultan fuentes públicas de mercado. En cada petición
            viajan los datos técnicos que cualquier servidor web registra:
            dirección IP, agente de usuario, fecha y hora, y la ruta consultada
            (incluido el símbolo buscado). Estos registros los genera el
            proveedor de alojamiento (Vercel) y se usan solo para operar el
            servicio y aplicar límites de peticiones.
          </p>
          <p>
            El contenido de tu cartera{" "}
            <span className="text-foreground">no</span> se transmite a ningún
            proveedor de inteligencia artificial ni a terceros para análisis.
            Los cálculos de cartera, impuestos y rebalanceo se ejecutan en tu
            dispositivo.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-foreground font-semibold">
            4. Finalidades del tratamiento
          </h2>
          <p className="text-foreground font-medium text-xs">Primarias</p>
          <ul className="text-xs space-y-1 list-disc pl-5">
            <li>Mostrar precios, métricas, dividendos y calendarios de mercado.</li>
            <li>Guardar tu cartera, watchlist y preferencias en tu dispositivo.</li>
            <li>Calcular rendimiento, impuestos estimados y rebalanceo localmente.</li>
            <li>Proteger el acceso a la app con clave o biometría si lo activas.</li>
            <li>Operar, proteger y limitar el abuso del servicio.</li>
          </ul>
          <p className="text-foreground font-medium text-xs pt-1">Secundarias</p>
          <p className="text-xs">
            No existen. La aplicación no hace publicidad, no perfila usuarios, no
            realiza mercadotecnia y no incorpora analítica de terceros ni píxeles
            de seguimiento.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-foreground font-semibold">
            5. Transferencias y terceros
          </h2>
          <p>
            No vendemos, alquilamos ni cedemos datos personales. Las siguientes
            fuentes de datos reciben las consultas técnicas descritas en el
            apartado 3, cada una bajo su propio aviso de privacidad:
          </p>
          <ul className="text-xs space-y-1.5">
            {TERCEROS.map(([nombre, uso, host]) => (
              <li key={nombre} className="rounded-xl border border-border bg-card px-3 py-2">
                <span className="text-foreground font-medium">{nombre}</span>
                <span className="block">{uso}</span>
                <span className="block font-mono text-[10px] text-muted break-all">
                  {host}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-foreground font-semibold">
            6. Respaldo en la nube (opcional)
          </h2>
          <p>
            Si activas el respaldo, un sobre{" "}
            <span className="text-foreground">cifrado</span> con tu cartera se
            guarda en jsonblob.com a través de una ruta propia de esta app. El
            servidor actúa como intermediario ciego:{" "}
            <span className="text-foreground">no posee la llave</span> de cifrado
            y no puede leer el contenido. La llave se deriva de tu clave y vive
            solo en la sesión de tu navegador.
          </p>
          <p>
            Puedes dejar de usar el respaldo en cualquier momento desde Ajustes.
            Eliminarlo del dispositivo no borra automáticamente la copia ya
            subida: pídelo al contacto de este aviso.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-foreground font-semibold">
            7. Cookies y almacenamiento local
          </h2>
          <p>
            La aplicación{" "}
            <span className="text-foreground">no usa cookies</span>. Usa{" "}
            <code className="text-xs">localStorage</code> para tus datos y{" "}
            <code className="text-xs">Cache Storage</code> (service worker) para
            funcionar sin conexión. El almacenamiento del service worker está
            acotado en número de entradas y caducidad, y excluye de forma
            explícita las rutas de respaldo cifrado y de entrega de tokens.
          </p>
          <p>
            Puedes borrar todo el almacenamiento local desde los ajustes de tu
            navegador o desde Ajustes de la app; eso elimina tu cartera de ese
            dispositivo.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-foreground font-semibold">8. Seguridad</h2>
          <ul className="text-xs space-y-1 list-disc pl-5">
            <li>Todas las comunicaciones viajan por HTTPS con HSTS.</li>
            <li>Las claves de las fuentes de datos se usan en el servidor y no se incrustan en el código del cliente.</li>
            <li>
              Excepción: si el administrador configura{" "}
              <code className="text-xs">FINNHUB_API_KEY</code> y usas el flujo de
              trades en tiempo real, esa clave se entrega a tu navegador porque
              el WebSocket de Finnhub la exige en el cliente. Es la única clave
              que sale del servidor; el resto no.
            </li>
            <li>Las rutas <code className="text-xs">/api/*</code> rechazan peticiones de otros orígenes y aplican límite de peticiones por IP.</li>
            <li>El cifrado local usa AES-GCM con llave derivada de tu clave (PBKDF2, 120.000 iteraciones). El hash de la clave se guarda en tu dispositivo; el servidor no lo recibe.</li>
            <li>Bloqueo tras intentos fallidos de clave y código de recuperación opcional.</li>
          </ul>
          <p className="text-xs">
            Ningún sistema es infalible. Si detectas una vulnerabilidad,
            repórtala al contacto de este aviso.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-foreground font-semibold">
            9. Derechos ARCO y cómo ejercerlos
          </h2>
          <p>
            Puedes ejercer tus derechos de{" "}
            <span className="text-foreground">
              Acceso, Rectificación, Cancelación y Oposición
            </span>
            , así como revocar tu consentimiento, escribiendo a{" "}
            <a href={`mailto:${CONTACTO_ARCO}`} className="text-primary break-all">
              {CONTACTO_ARCO}
            </a>
            .
          </p>
          <p className="text-xs">
            Dado que la app no conserva un registro de usuarios, en la práctica
            la mayor parte de estos derechos se ejercen directamente en tu
            dispositivo:
          </p>
          <ul className="text-xs space-y-1 list-disc pl-5">
            <li>
              <span className="text-foreground">Acceso:</span> tus datos están en
              el almacenamiento local de tu navegador y puedes verlos en Ajustes.
            </li>
            <li>
              <span className="text-foreground">Rectificación:</span> edita tu
              cartera, watchlist y contactos de recuperación en la app.
            </li>
            <li>
              <span className="text-foreground">Cancelación:</span> borra el
              almacenamiento del sitio en tu navegador, o usa las opciones de
              borrado de Ajustes.
            </li>
            <li>
              <span className="text-foreground">Oposición:</span> deja de usar la
              app o desactiva el respaldo en la nube y el bloqueo con clave.
            </li>
          </ul>
          <p className="text-xs">
            Responderemos las solicitudes en los plazos que marca la LFPDPPP. Si
            la respuesta no te satisface, puedes acudir al Instituto Nacional de
            Transparencia, Acceso a la Información y Protección de Datos
            Personales (INAI).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-foreground font-semibold">
            10. Cambios a este aviso
          </h2>
          <p>
            Si la aplicación incorpora cuentas de usuario, pagos u otros
            tratamientos, este aviso se actualizará antes de que esos datos se
            recaben y la nueva versión se publicará en esta misma ruta.
          </p>
          <p className="text-xs">
            Última actualización:{" "}
            <span className="text-foreground">{ULTIMA_ACTUALIZACION}</span>.
          </p>
        </section>

        <div className="rounded-2xl border border-border bg-card p-3.5 text-xs">
          <p className="text-foreground font-medium mb-1">Otros avisos</p>
          <p className="flex flex-wrap gap-x-3 gap-y-1">
            <Link href="/legal/aviso" className="text-primary">
              Aviso de no asesoría
            </Link>
            <Link href="/legal/terminos" className="text-primary">
              Términos de uso
            </Link>
            <Link href="/legal" className="text-primary">
              Índice legal
            </Link>
          </p>
        </div>

        <p className="text-xs">
          Este aviso describe el tratamiento real que hace esta versión de la
          aplicación. No constituye asesoría legal.
        </p>
      </main>
    </div>
  );
}
