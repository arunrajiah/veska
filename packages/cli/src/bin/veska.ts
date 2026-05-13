#!/usr/bin/env node
import { Command } from 'commander';
import { createPluginCommand } from '../commands/create-plugin.js';
import { devCommand } from '../commands/dev.js';

const program = new Command();

program
  .name('veska')
  .description('Veska CLI — scaffold plugins and run local dev instances')
  .version('0.1.0');

program.addCommand(createPluginCommand());
program.addCommand(devCommand());

program.parse();
