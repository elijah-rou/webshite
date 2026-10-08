import { spawnSync } from 'node:child_process';

// This machine's node shim runs Bun. Both runtimes have their own native test runner.
const args = process.versions.bun ? ['test', './tests/'] : ['--test', './tests/audio.test.ts', './tests/fuzzy.test.ts'];
const result = spawnSync(process.execPath, args, { stdio: 'inherit', timeout: 30000 });
if (result.error) { throw result.error; }
process.exit(result.status ?? 1);
