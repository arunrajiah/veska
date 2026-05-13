export interface StorageProvider {
  upload(key: string, data: Buffer, mimeType: string): Promise<string>; // returns URL
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  mimeType: string;
}
