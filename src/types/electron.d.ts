export {};

declare global {
  interface Window {
    agentForge: {
      invoke(channel: string, args: Record<string, unknown>): Promise<unknown>;
      onEvent(channel: string, callback: (data: any) => void): () => void;
    };
  }
}
