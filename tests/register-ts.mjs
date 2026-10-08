/**
 * Hook de resolución para correr los tests de unidad con `node --test`.
 *
 * El código de `src/` usa importaciones relativas sin extensión
 * (`./search-text`), que es lo correcto para el bundler de Next pero que el
 * cargador ESM de Node no resuelve. Este hook completa la extensión `.ts`
 * cuando el especificador relativo existe como TypeScript en disco.
 *
 * Se activa con: node --import ./tests/register-ts.mjs --test ...
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./ts-resolve-hook.mjs", pathToFileURL(`${import.meta.dirname}/`));
