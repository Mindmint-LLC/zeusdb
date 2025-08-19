#!/usr/bin/env node

import generate from './generate';
import init from './init';

(async () => {
  const [,, command] = process.argv;

  // CLI Command Router
  switch (command) {
    case 'init':
      await init()
      break;
    case 'generate':
      await generate();
      break;
    default:
      console.log(`Unknown command: ${command}`);
      process.exit(1);
  }
})();
