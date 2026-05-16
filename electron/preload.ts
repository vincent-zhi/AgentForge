import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('agentForge', {
  invoke: (channel: string, ...args: unknown[]) =>
    ipcRenderer.invoke('agentForge:invoke', channel, ...args),
});
