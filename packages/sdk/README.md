# @veska/sdk

TypeScript SDK for building plugins on the [Veska](https://github.com/arunrajiah/veska) platform.

## Install

```bash
npm install @veska/sdk
# or
pnpm add @veska/sdk
```

## Usage

```ts
import type { VeskaPluginContext, PluginManifest } from '@veska/sdk';

export async function onInstall(ctx: VeskaPluginContext): Promise<void> {
  // Create a contact when plugin is installed
  const { id } = await ctx.entities.create({
    entityType: 'Contact',
    data: { firstName: 'Setup', lastName: 'Bot', email: 'bot@example.com' },
  });

  await ctx.audit.log('plugin.installed', { contactId: id });
}
```

## Scaffold a plugin

```bash
npx @veska/cli create-plugin my-plugin
```

## API

### `VeskaPluginContext`

Injected into every plugin handler. Provides safe, tenant-scoped access to the platform.

| Property | Description |
|---|---|
| `ctx.tenantId` | The tenant this execution is scoped to |
| `ctx.pluginId` | This plugin's own ID |
| `ctx.entities.find(query)` | Query entity records |
| `ctx.entities.findOne(type, id)` | Fetch a single entity |
| `ctx.entities.create(mutation)` | Create an entity record |
| `ctx.entities.update(type, id, data)` | Update an entity record |
| `ctx.entities.delete(type, id)` | Delete an entity record |
| `ctx.workflows.trigger(id, ctx?)` | Trigger a workflow run |
| `ctx.channels.send(msg)` | Send a message via Slack/WhatsApp/Email |
| `ctx.ai.run(params)` | Run an AI agent |
| `ctx.audit.log(action, details?)` | Write to the audit log |

### `PluginManifestSchema`

Zod schema for validating `veska.plugin.json` manifests.

## License

Apache 2.0
