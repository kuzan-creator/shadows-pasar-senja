// Hand-in program for Shadows of Pasar Senja — Stealth Heist.
// Node 22, standard library only. It copies game/ and screenshots/ from
// beside this file into the output directory and writes dossier.json with
// the vendored make.fun library, exactly as the scorer rebuilds it.
//   MAKEFUN_OUTPUT_DIR=out node main.ts
// The grader runs it twice from a fresh container with no network; both
// runs must write identical bytes, so there is no timestamp or randomness
// anywhere in this program. Paths are absolute, derived from this file's
// own location — never relative to the working directory.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
