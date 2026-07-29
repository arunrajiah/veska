import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import prompts from 'prompts';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

interface CreatePluginOptions {
  author?: string;
  developerId?: string;
  description?: string;
  license?: string;
  yes?: boolean;
}

interface ScaffoldAnswers {
  pluginName?: string;
  authorName?: string;
  developerId?: string;
  description?: string;
  license?: string;
}

const LICENSES = ['Apache-2.0', 'MIT', 'Commercial'];

export function createPluginCommand(): Command {
  return new Command('create-plugin')
    .description('Scaffold a new Veska plugin')
    .argument('[name]', 'Plugin name (e.g. my-inventory-plugin)')
    .option('--author <name>', 'Author / company name')
    .option('--developer-id <id>', 'Your Veska developer ID')
    .option('--description <text>', 'Short description')
    .option('--license <spdx>', `License (${LICENSES.join(', ')})`)
    .option('-y, --yes', 'Skip all prompts and use flags plus defaults')
    .action(async (name: string | undefined, options: CreatePluginOptions) => {
      if (options.license && !LICENSES.includes(options.license)) {
        console.error(
          chalk.red(
            `Unknown license "${options.license}". Expected one of: ${LICENSES.join(', ')}`,
          ),
        );
        process.exitCode = 1;
        return;
      }

      console.log(chalk.bold('\nVeska Plugin Scaffolder\n'));

      // Every value can arrive as a flag. Only ask for what is still missing, and with
      // --yes ask for nothing at all so the command can run in scripts and in CI.
      const answers: ScaffoldAnswers = options.yes
        ? {}
        : await prompts([
            {
              type: name ? null : 'text',
              name: 'pluginName',
              message: 'Plugin name (kebab-case)',
              initial: 'my-plugin',
            },
            {
              type: options.author ? null : 'text',
              name: 'authorName',
              message: 'Author / company name',
            },
            {
              type: options.developerId ? null : 'text',
              name: 'developerId',
              message: 'Your Veska developer ID',
              initial: 'dev_',
            },
            {
              type: options.description ? null : 'text',
              name: 'description',
              message: 'Short description',
            },
            {
              type: options.license ? null : 'select',
              name: 'license',
              message: 'License',
              choices: LICENSES.map((value) => ({
                title: value === 'Apache-2.0' ? 'Apache 2.0' : value,
                value,
              })),
            },
          ]);

      const pluginName = (name ?? answers.pluginName ?? 'my-plugin') as string;
      const authorName = (options.author ?? answers.authorName ?? '') as string;
      const developerId = (options.developerId ?? answers.developerId ?? 'dev_') as string;
      const description = (options.description ?? answers.description ?? '') as string;
      const license = (options.license ?? answers.license ?? 'Apache-2.0') as string;

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
            description,
            author: {
              name: authorName,
              developerId,
            },
            veskaMinVersion: '0.1.0',
            capabilitiesRequired: [],
            capabilitiesProvided: [],
            networkWhitelist: [],
            pricing: { model: 'free' },
            license,
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

      // esbuild.mjs — the plugin runtime runs a single CommonJS file and blocks
      // require(), so everything the plugin imports has to be bundled in.
      writeFileSync(
        join(dir, 'esbuild.mjs'),
        `import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  logLevel: 'info',
});
`,
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
