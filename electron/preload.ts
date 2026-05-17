import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('agentForge', {
  invoke: (channel: string, args: Record<string, unknown>) =>
    ipcRenderer.invoke(channel, args),
  onEvent: (channel: string, callback: (data: any) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on(channel, handler);
    return () => {
      ipcRenderer.removeListener(channel, handler);
    };
  },
});
