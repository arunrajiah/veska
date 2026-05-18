import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Minimal local-disk storage implementation for OSS deployments.
 * Files are stored under `baseDir` with `/` in keys replaced by `_` for
 * filesystem compatibility.
 *
 * For production deployments, set AWS_S3_BUCKET (or STORAGE_PROVIDER=local
 * to keep local storage even on a server) — see .env.example.
 */
export class LocalStorage {
  constructor(
    private readonly baseDir: string = './uploads',
    private readonly baseUrl: string = 'http://localhost:3001/uploads',
  ) {
    if (!existsSync(baseDir)) {
      mkdirSync(baseDir, { recursive: true });
    }
  }

  async upload(key: string, data: Buffer, _mimeType: string): Promise<string> {
    const filePath = join(this.baseDir, key.replace(/\//g, '_'));
    writeFileSync(filePath, data);
    return this.getUrl(key);
  }

  async download(key: string): Promise<Buffer> {
    return readFileSync(join(this.baseDir, key.replace(/\//g, '_')));
  }

  async delete(key: string): Promise<void> {
    const filePath = join(this.baseDir, key.replace(/\//g, '_'));
    if (existsSync(filePath)) unlinkSync(filePath);
  }

  getUrl(key: string): string {
    return `${this.baseUrl}/${key.replace(/\//g, '_')}`;
  }
}
