// Vice Cover Lab's entry program (Node 22, standard library only).
//
// It hands the app in: it copies this repository's app/ (the offline cover
// maker: index.html, its style and ES modules, the vendored OFL fonts and the
// two sample photos) and screenshots/ (the four JPEGs the maker took with
// Playwright) into the output directory, then writes output/dossier.json with
// buildDossier from the vendored make.fun library, so the judge can read the
// app from the dossier alone.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The caps below are the scorer's own: at most 4 screenshots of 256 KiB each,
// app/ at most 993 files and 48 MiB with every path under 1000 bytes, and the
// dossier text capped at 160 KiB. The program refuses to write an entry the
// scorer would refuse, instead of handing in a broken one.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
