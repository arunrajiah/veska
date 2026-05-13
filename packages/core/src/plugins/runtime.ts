import { Worker } from 'node:worker_threads';

// Message protocol between host and worker
interface SdkCallMessage {
  id: string;
  type: 'sdk_call';
  method: string; // e.g. 'entities.find', 'channels.send', 'audit.log'
  args: unknown[];
}

interface SdkResponseMessage {
  id: string;
  type: 'sdk_response';
  result?: unknown;
  error?: string;
}

interface PluginCompleteMessage {
  type: 'plugin_complete';
  result?: unknown;
  error?: string;
}

export interface PluginRunContext {
  tenantId: string;
  pluginId: string;
  // SDK method implementations (run in main thread)
  sdkHandlers: {
    'entities.find': (args: unknown[]) => Promise<unknown>;
    'entities.findOne': (args: unknown[]) => Promise<unknown>;
    'entities.create': (args: unknown[]) => Promise<unknown>;
    'entities.update': (args: unknown[]) => Promise<unknown>;
    'entities.delete': (args: unknown[]) => Promise<unknown>;
    'workflows.trigger': (args: unknown[]) => Promise<unknown>;
    'channels.send': (args: unknown[]) => Promise<unknown>;
    'audit.log': (args: unknown[]) => Promise<unknown>;
  };
}

export interface PluginRunResult {
  success: boolean;
  result?: unknown;
  error?: string;
  durationMs: number;
}

export class PluginRuntime {
  private readonly timeoutMs: number;

  constructor(opts: { timeoutMs?: number } = {}) {
    this.timeoutMs = opts.timeoutMs ?? 30_000;
  }

  /**
   * Execute a plugin function in an isolated worker thread.
   * pluginCode is the compiled JS string (the plugin's ESM default export is a function).
   */
  async run(params: {
    pluginCode: string;
    functionName: string; // exported function to call, e.g. 'onEntityCreated'
    input: Record<string, unknown>;
    context: PluginRunContext;
  }): Promise<PluginRunResult> {
    const start = Date.now();

    return new Promise((resolve) => {
      const workerScript = buildWorkerScript();

      const worker = new Worker(workerScript, {
        eval: true,
        workerData: {
          pluginCode: params.pluginCode,
          functionName: params.functionName,
          input: params.input,
          tenantId: params.context.tenantId,
          pluginId: params.context.pluginId,
        },
        resourceLimits: {
          maxOldGenerationSizeMb: 64,
          maxYoungGenerationSizeMb: 16,
        },
      });

      const timeout = setTimeout(() => {
        void worker.terminate();
        resolve({ success: false, error: 'Plugin timed out', durationMs: Date.now() - start });
      }, this.timeoutMs);

      worker.on('message', async (msg: SdkCallMessage | PluginCompleteMessage) => {
        if (msg.type === 'plugin_complete') {
          clearTimeout(timeout);
          await worker.terminate();
          resolve({
            success: !msg.error,
            result: msg.result,
            error: msg.error,
            durationMs: Date.now() - start,
          });
          return;
        }

        if (msg.type === 'sdk_call') {
          const handler = params.context.sdkHandlers[msg.method as keyof PluginRunContext['sdkHandlers']];
          try {
            const result = handler ? await handler(msg.args) : undefined;
            worker.postMessage({ id: msg.id, type: 'sdk_response', result } satisfies SdkResponseMessage);
          } catch (err) {
            worker.postMessage({
              id: msg.id,
              type: 'sdk_response',
              error: err instanceof Error ? err.message : String(err),
            } satisfies SdkResponseMessage);
          }
        }
      });

      worker.on('error', (err) => {
        clearTimeout(timeout);
        resolve({ success: false, error: err.message, durationMs: Date.now() - start });
      });
    });
  }
}

function buildWorkerScript(): string {
  return `
const { workerData, parentPort } = require('worker_threads');
const { randomUUID } = require('crypto');

// Pending SDK call resolvers
const pending = new Map();

// Listen for SDK responses from the host
parentPort.on('message', (msg) => {
  if (msg.type === 'sdk_response') {
    const resolve = pending.get(msg.id);
    if (resolve) {
      pending.delete(msg.id);
      resolve(msg);
    }
  }
});

// SDK proxy: forwards calls to the main thread
function makeSdkCall(method, ...args) {
  return new Promise((resolve, reject) => {
    const id = randomUUID();
    pending.set(id, (response) => {
      if (response.error) reject(new Error(response.error));
      else resolve(response.result);
    });
    parentPort.postMessage({ id, type: 'sdk_call', method, args });
  });
}

const ctx = {
  tenantId: workerData.tenantId,
  pluginId: workerData.pluginId,
  entities: {
    find: (...a) => makeSdkCall('entities.find', ...a),
    findOne: (...a) => makeSdkCall('entities.findOne', ...a),
    create: (...a) => makeSdkCall('entities.create', ...a),
    update: (...a) => makeSdkCall('entities.update', ...a),
    delete: (...a) => makeSdkCall('entities.delete', ...a),
  },
  workflows: {
    trigger: (...a) => makeSdkCall('workflows.trigger', ...a),
  },
  channels: {
    send: (...a) => makeSdkCall('channels.send', ...a),
  },
  audit: {
    log: (...a) => makeSdkCall('audit.log', ...a),
  },
};

async function main() {
  try {
    // Execute the plugin code to get its exports
    const mod = { exports: {} };
    const fn = new Function('module', 'exports', 'require', workerData.pluginCode);
    fn(mod, mod.exports, () => { throw new Error('require() not allowed in plugins'); });

    const pluginFn = mod.exports[workerData.functionName] ?? mod.exports.default;
    if (typeof pluginFn !== 'function') {
      throw new Error(\`Plugin does not export function: \${workerData.functionName}\`);
    }

    const result = await pluginFn(workerData.input, ctx);
    parentPort.postMessage({ type: 'plugin_complete', result });
  } catch (err) {
    parentPort.postMessage({ type: 'plugin_complete', error: err.message });
  }
}

main();
`;
}
