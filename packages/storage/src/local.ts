import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import type { StorageProvider } from './types';

export class LocalStorage implements StorageProvider {
  private basePath: string;
  private baseUrl: string;

  constructor(basePath = './uploads', baseUrl = 'http://localhost:3001/uploads') {
    this.basePath = basePath;
    this.baseUrl = baseUrl;
    if (!existsSync(basePath)) mkdirSync(basePath, { recursive: true });
  }

  async upload(key: string, data: Buffer, _mimeType: string): Promise<string> {
    const filePath = join(this.basePath, key.replace(/\//g, '_'));
    writeFileSync(filePath, data);
    return this.getUrl(key);
  }

  async download(key: string): Promise<Buffer> {
    return readFileSync(join(this.basePath, key.replace(/\//g, '_')));
  }

  async delete(key: string): Promise<void> {
    const filePath = join(this.basePath, key.replace(/\//g, '_'));
    if (existsSync(filePath)) unlinkSync(filePath);
  }

  getUrl(key: string): string {
    return `${this.baseUrl}/${key.replace(/\//g, '_')}`;
  }
}
