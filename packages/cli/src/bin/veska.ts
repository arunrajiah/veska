#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPluginCommand } from '../commands/create-plugin.js';
import { devCommand } from '../commands/dev.js';

// Read the real version rather than repeating it here, where it went stale.
const { version } = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json'), 'utf8'),
) as { version: string };

const program = new Command();

program
  .name('veska')
  .description('Veska CLI — scaffold plugins and run local dev instances')
  .version(version);

program.addCommand(createPluginCommand());
program.addCommand(devCommand());

program.parse();
