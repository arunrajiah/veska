export * from './types';
export { LocalStorage } from './local';
import { LocalStorage } from './local';

// Factory: returns LocalStorage by default; swap for S3 in production via STORAGE_PROVIDER env
export function createStorage(): import('./types').StorageProvider {
  // Future: if (process.env.STORAGE_PROVIDER === 's3') return new S3Storage(...)
  return new LocalStorage(
    process.env.UPLOAD_PATH ?? './uploads',
    process.env.UPLOAD_BASE_URL ?? 'http://localhost:3001/uploads'
  );
}
