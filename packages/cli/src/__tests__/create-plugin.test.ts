import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPluginCommand } from '../commands/create-plugin.js';

function read(dir: string, file: string): string {
  return readFileSync(join(dir, file), 'utf8');
}

describe('create-plugin', () => {
  let workDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    workDir = mkdtempSync(join(tmpdir(), 'veska-cli-'));
    process.chdir(workDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(workDir, { recursive: true, force: true });
    process.exitCode = 0;
  });

  it('scaffolds non-interactively with --yes', async () => {
    await createPluginCommand().parseAsync(
      [
        'my-plugin',
        '--yes',
        '--author',
        'Acme Ltd',
        '--developer-id',
        'dev_acme',
        '--description',
        'A scaffold test',
        '--license',
        'MIT',
      ],
      { from: 'user' },
    );

    const plugin = join(workDir, 'my-plugin');
    expect(existsSync(plugin)).toBe(true);

    const manifest = JSON.parse(read(plugin, 'veska.plugin.json'));
    expect(manifest.name).toBe('my-plugin');
    expect(manifest.author).toEqual({ name: 'Acme Ltd', developerId: 'dev_acme' });
    expect(manifest.description).toBe('A scaffold test');
    expect(manifest.license).toBe('MIT');
  });

  // Regression: 0.1.0 shipped a build script calling a file the scaffold never wrote,
  // so every generated plugin failed on its first build.
  it('writes every file its own package.json scripts depend on', async () => {
    await createPluginCommand().parseAsync(['my-plugin', '--yes'], { from: 'user' });

    const plugin = join(workDir, 'my-plugin');
    for (const file of ['package.json', 'tsconfig.json', 'esbuild.mjs', 'src/index.ts']) {
      expect(existsSync(join(plugin, file)), `${file} is missing`).toBe(true);
    }

    const pkg = JSON.parse(read(plugin, 'package.json'));
    expect(pkg.scripts.build).toContain('esbuild.mjs');
    expect(read(plugin, 'esbuild.mjs')).toContain('src/index.ts');
  });

  it('defaults the license and rejects an unknown one', async () => {
    await createPluginCommand().parseAsync(['default-license', '--yes'], { from: 'user' });
    expect(JSON.parse(read(join(workDir, 'default-license'), 'veska.plugin.json')).license).toBe(
      'Apache-2.0',
    );

    await createPluginCommand().parseAsync(['bad-license', '--yes', '--license', 'WTFPL'], {
      from: 'user',
    });
    expect(existsSync(join(workDir, 'bad-license'))).toBe(false);
    expect(process.exitCode).toBe(1);
  });
});
