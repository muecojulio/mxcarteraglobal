import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const EXTENSIONS = [".ts", ".tsx", ".js", ".mjs", ".cjs"];

export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    const relative =
      specifier.startsWith("./") || specifier.startsWith("../");
    if (!relative || !context.parentURL) throw error;

    const base = path.dirname(fileURLToPath(context.parentURL));
    const target = path.resolve(base, specifier);

    for (const ext of EXTENSIONS) {
      if (existsSync(target + ext) && !existsSync(target)) {
        return { url: pathToFileURL(target + ext).href, shortCircuit: true };
      }
    }
    const indexTs = path.join(target, "index.ts");
    if (existsSync(indexTs)) {
      return { url: pathToFileURL(indexTs).href, shortCircuit: true };
    }
    throw error;
  }
}
