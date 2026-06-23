# @veska/cli

CLI for building and running [Veska](https://github.com/arunrajiah/veska) plugins.

## Usage

```bash
# Scaffold a new plugin (no install needed)
npx @veska/cli create-plugin my-plugin

# Or install globally
npm install -g @veska/cli
veska create-plugin my-plugin
```

## Commands

### `veska create-plugin [name]`

Scaffolds a new plugin directory with:

- `veska.plugin.json` — plugin manifest
- `package.json` — with `@veska/sdk` dependency
- `src/index.ts` — `onInstall` / `onUninstall` entry points
- `tsconfig.json`

### `veska dev`

Starts a local Veska dev instance via Docker Compose and prints the service URLs.

```
Veska API:      http://localhost:3001
Veska Admin UI: http://localhost:3000
PostgreSQL:     localhost:5432
Redis:          localhost:6379
```

Use `--no-docker` to skip Docker Compose startup if services are already running.

## License

Apache 2.0
