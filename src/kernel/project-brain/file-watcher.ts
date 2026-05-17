import chokidar, { type FSWatcher } from 'chokidar';
import type { BrowserWindow } from 'electron';
import { EVENT_CHANNELS } from '@/ipc/event-channels';

export class FileWatcher {
  private watcher: FSWatcher | null = null;
  private markStaleCallback: ((filePath: string) => void) | null = null;

  setMarkStaleCallback(callback: (filePath: string) => void): void {
    this.markStaleCallback = callback;
  }

  start(rootPath: string, mainWindow: BrowserWindow): void {
    if (this.watcher) {
      this.stop();
    }

    this.watcher = chokidar.watch(rootPath, {
      ignored: [/node_modules/, /\.git/, /dist/, /build/, /\.DS_Store/],
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher.on('change', (filePath: string) => {
      if (this.markStaleCallback) {
        this.markStaleCallback(filePath);
      }
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send(EVENT_CHANNELS.FILE_CHANGED, {
          event: 'change',
          filePath,
        });
      }
    });

    this.watcher.on('add', (filePath: string) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send(EVENT_CHANNELS.FILE_CHANGED, {
          event: 'add',
          filePath,
        });
      }
    });

    this.watcher.on('unlink', (filePath: string) => {
      if (this.markStaleCallback) {
        this.markStaleCallback(filePath);
      }
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send(EVENT_CHANNELS.FILE_CHANGED, {
          event: 'unlink',
          filePath,
        });
      }
    });
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  isWatching(): boolean {
    return this.watcher !== null;
  }
}
