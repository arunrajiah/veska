import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import prompts from 'prompts';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export function createPluginCommand(): Command {
  return new Command('create-plugin')
    .description('Scaffold a new Veska plugin')
    .argument('[name]', 'Plugin name (e.g. my-inventory-plugin)')
    .action(async (name?: string) => {
      console.log(chalk.bold('\nVeska Plugin Scaffolder\n'));

      const answers = await prompts([
        {
          type: name ? null : 'text',
          name: 'pluginName',
          message: 'Plugin name (kebab-case)',
          initial: 'my-plugin',
        },
        {
          type: 'text',
          name: 'authorName',
          message: 'Author / company name',
        },
        {
          type: 'text',
          name: 'developerId',
          message: 'Your Veska developer ID',
          initial: 'dev_',
        },
        {
          type: 'text',
          name: 'description',
          message: 'Short description',
        },
        {
          type: 'select',
          name: 'license',
          message: 'License',
          choices: [
            { title: 'Apache 2.0', value: 'Apache-2.0' },
            { title: 'MIT', value: 'MIT' },
            { title: 'Commercial', value: 'Commercial' },
          ],
        },
      ]);

      const pluginName = (name ?? answers.pluginName) as string;
      const spinner = ora(`Creating plugin ${chalk.cyan(pluginName)}`).start();

      const dir = join(process.cwd(), pluginName);
      mkdirSync(join(dir, 'src'), { recursive: true });

      // veska.plugin.json
      writeFileSync(
        join(dir, 'veska.plugin.json'),
        JSON.stringify(
          {
            id: `com.example.${pluginName}`,
            name: pluginName,
            version: '0.1.0',
            description: answers.description,
            author: {
              name: answers.authorName,
              developerId: answers.developerId,
            },
            veskaMinVersion: '0.1.0',
            capabilitiesRequired: [],
            capabilitiesProvided: [],
            networkWhitelist: [],
            pricing: { model: 'free' },
            license: answers.license,
          },
          null,
          2,
        ),
      );

      // package.json
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify(
          {
            name: pluginName,
            version: '0.1.0',
            type: 'module',
            main: './dist/index.js',
            scripts: {
              build: 'tsc && node esbuild.mjs',
              dev: 'tsc --watch',
              test: 'vitest run',
            },
            dependencies: {
              '@veska/sdk': '*',
            },
            devDependencies: {
              typescript: '^5.7.2',
              vitest: '^2.1.8',
              esbuild: '^0.24.0',
            },
          },
          null,
          2,
        ),
      );

      // Main entry point
      writeFileSync(
        join(dir, 'src', 'index.ts'),
        `import type { VeskaPluginContext } from '@veska/sdk';

export async function onInstall(ctx: VeskaPluginContext): Promise<void> {
  await ctx.audit.log('plugin.installed', { pluginId: ctx.pluginId });
}

export async function onUninstall(ctx: VeskaPluginContext): Promise<void> {
  await ctx.audit.log('plugin.uninstalled', { pluginId: ctx.pluginId });
}
`,
      );

      // tsconfig.json
      writeFileSync(
        join(dir, 'tsconfig.json'),
        JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2022',
              module: 'NodeNext',
              moduleResolution: 'NodeNext',
              strict: true,
              outDir: './dist',
              rootDir: './src',
              declaration: true,
              skipLibCheck: true,
            },
            include: ['src'],
          },
          null,
          2,
        ),
      );

      spinner.succeed(`Plugin ${chalk.cyan(pluginName)} created at ${chalk.dim(dir)}`);
      console.log(`\nNext steps:\n  cd ${pluginName}\n  pnpm install\n  pnpm dev\n`);
    });
}
