// Sunstone Gambit — make.fun entry hand-in (Node 22 standard library only).
// Copies static offline game/ and screenshots/ into MAKEFUN_OUTPUT_DIR (or /output)
// and deterministically writes dossier.json via the unchanged vendored makefun-game library.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const ROOT_DIR = fileURLToPath(new URL('.', import.meta.url));
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
} as const;

function copyDirectoryClean(sourceDir: string, targetDir: string): void {
  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true, force: true });
  }
  mkdirSync(targetDir, { recursive: true });
  if (existsSync(sourceDir)) {
    cpSync(sourceDir, targetDir, { recursive: true });
  }
}

function handInEntry(): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  copyDirectoryClean(join(ROOT_DIR, 'game'), join(OUTPUT_DIR, 'game'));
  copyDirectoryClean(join(ROOT_DIR, 'screenshots'), join(OUTPUT_DIR, 'screenshots'));

  const dossierBytes = buildDossier(OUTPUT_DIR, DOSSIER_CAPS);
  writeFileSync(join(OUTPUT_DIR, 'dossier.json'), dossierBytes);
}

handInEntry();
