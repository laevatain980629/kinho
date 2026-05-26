import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as process from 'node:process';

const candidates = [
  resolve(process.cwd(), '../..', '.env'),
  resolve(process.cwd(), '.env'),
];
const initialKeys = new Set(Object.keys(process.env));

for (const file of [...new Set(candidates)]) {
  if (!existsSync(file)) continue;
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index <= 0) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!initialKeys.has(key)) {
      process.env[key] = value;
    }
  }
}
