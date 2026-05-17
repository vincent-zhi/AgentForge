import { app } from 'electron';
import fs from 'fs';
import path from 'path';

const DEFAULT_SETTINGS: Record<string, string> = {
  defaultModel: 'gpt-4',
  theme: 'dark',
};

export class SettingsService {
  private filePath: string;
  private cache: Record<string, string> | null = null;

  constructor() {
    this.filePath = path.join(app.getPath('userData'), 'settings.json');
  }

  private async load(): Promise<Record<string, string>> {
    if (this.cache !== null) return this.cache;
    let data: Record<string, string>;
    try {
      const raw = await fs.promises.readFile(this.filePath, 'utf-8');
      data = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      data = { ...DEFAULT_SETTINGS };
    }
    this.cache = data;
    return data;
  }

  private async save(data: Record<string, string>): Promise<void> {
    this.cache = data;
    await fs.promises.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.promises.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async get(key: string): Promise<string | null> {
    const data = await this.load();
    return data[key] ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    const data = await this.load();
    data[key] = value;
    await this.save(data);
  }

  async getAll(): Promise<Record<string, string>> {
    return this.load();
  }

  async delete(key: string): Promise<void> {
    const data = await this.load();
    delete data[key];
    await this.save(data);
  }
}
