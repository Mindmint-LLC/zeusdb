#!/usr/bin/env node

import { spawn } from 'child_process';
import { createRequire } from 'module';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);

process.removeAllListeners('warning');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const entryPath = resolve(__dirname, `../src/cli/index.ts`);
const tsxBin = require.resolve('tsx/cli');

spawn('node', [tsxBin, entryPath, ...process.argv.slice(2)], {
  stdio: 'inherit'
});