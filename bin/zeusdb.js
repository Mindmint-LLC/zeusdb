#!/usr/bin/env node

import { spawn } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const entryPath = resolve(__dirname, `../dist/cli/index.js`);

spawn('node', [entryPath, ...process.argv.slice(2)], {
  stdio: 'inherit'
});