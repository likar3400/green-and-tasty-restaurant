/**
 * Generates src/environments/environment.production.ts from the BACKEND_URL env var.
 * Runs automatically before `npm run build` (npm "prebuild" hook).
 *
 * Usage:
 *   BACKEND_URL=https://<api-id>.execute-api.<region>.amazonaws.com/develop npm run build
 *
 * The generated file is git-ignored on purpose: the API URL is environment
 * configuration, not source code.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const OUT_FILE = resolve('src/environments/environment.production.ts');
const backendUrl = process.env.BACKEND_URL?.trim();

if (!backendUrl) {
  console.error(
    [
      '',
      'BACKEND_URL is not set — refusing to build a production bundle.',
      '',
      'Without it the bundle would ship the literal BACKEND_URL_PLACEHOLDER',
      'and every API call would fail at runtime.',
      '',
      'Examples:',
      '  BACKEND_URL=https://<api-id>.execute-api.<region>.amazonaws.com/develop npm run build',
      '  npm start                     # local dev, no BACKEND_URL needed',
      '',
    ].join('\n')
  );
  process.exit(1);
}

let parsedBackendUrl;
try {
  parsedBackendUrl = new URL(backendUrl);
} catch {
  console.error('BACKEND_URL must be a valid absolute URL.');
  process.exit(1);
}

if (parsedBackendUrl.protocol !== 'https:' || parsedBackendUrl.username || parsedBackendUrl.password) {
  console.error('BACKEND_URL must be an HTTPS URL without embedded credentials.');
  process.exit(1);
}

if (parsedBackendUrl.search || parsedBackendUrl.hash) {
  console.error('BACKEND_URL must not include a query string or fragment.');
  process.exit(1);
}

const contents = `// GENERATED FILE — do not edit, do not commit.
// Produced by scripts/set-env.mjs from the BACKEND_URL environment variable.
export const environment = {
  backendUrl: ${JSON.stringify(parsedBackendUrl.toString().replace(/\/$/, ''))},
};
`;

mkdirSync(dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, contents, 'utf8');
console.log(`environment.production.ts generated for ${parsedBackendUrl.origin}${parsedBackendUrl.pathname.replace(/\/$/, '')}`);
