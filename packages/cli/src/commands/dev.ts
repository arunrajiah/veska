import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'node:child_process';

export function devCommand(): Command {
  return new Command('dev')
    .description('Start a local Veska development instance (requires Docker)')
    .option('--no-docker', 'Skip Docker Compose startup (assume services are already running)')
    .action((options: { docker: boolean }) => {
      console.log(chalk.bold('\nVeska Dev\n'));

      if (options.docker) {
        console.log(chalk.dim('Starting Docker Compose services...'));
        try {
          execSync('docker compose up -d', { stdio: 'inherit' });
        } catch {
          console.error(chalk.red('Failed to start Docker services. Is Docker running?'));
          process.exit(1);
        }
      }

      console.log(chalk.green('\nVeska API:      ') + 'http://localhost:3001');
      console.log(chalk.green('Veska Admin UI: ') + 'http://localhost:3000');
      console.log(chalk.green('PostgreSQL:     ') + 'localhost:5432');
      console.log(chalk.green('Redis:          ') + 'localhost:6379');
      console.log(chalk.dim('\nPress Ctrl+C to stop.\n'));
    });
}
