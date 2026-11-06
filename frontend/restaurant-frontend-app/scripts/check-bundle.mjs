/**
 * Fails the build if the produced bundle still contains configuration placeholders.
 * Runs automatically after `npm run build` (npm "postbuild" hook).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const BUNDLE_DIR = resolve('dist/restaurant-frontend-app/browser');
const FORBIDDEN = ['BACKEND_URL_PLACEHOLDER', 'demo-catalog-rustaveli-48'];
const expectedBackendUrl = process.env.BACKEND_URL
  ? new URL(process.env.BACKEND_URL.trim()).toString().replace(/\/$/, '')
  : undefined;

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

let failed = false;
let expectedUrlFound = false;

for (const file of walk(BUNDLE_DIR).filter((f) => /\.(js|css|html)$/.test(f))) {
  const contents = readFileSync(file, 'utf8');
  if (expectedBackendUrl && contents.includes(expectedBackendUrl)) {
    expectedUrlFound = true;
  }
  for (const token of FORBIDDEN) {
    if (contents.includes(token)) {
      console.error(`${token} found in ${file.replace(`${BUNDLE_DIR}/`, '')}`);
      failed = true;
    }
  }
}

if (expectedBackendUrl && !expectedUrlFound) {
  console.error('Configured BACKEND_URL was not found in the production bundle.');
  failed = true;
}

if (failed) {
  console.error('\nBundle is not deployable: configuration placeholders were not substituted.');
  process.exit(1);
}

console.log(
  expectedBackendUrl
    ? 'Bundle check passed: no placeholders; configured API URL is present.'
    : 'Bundle check passed: no configuration placeholders left.',
);
