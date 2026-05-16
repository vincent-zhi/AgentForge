export {};

declare global {
  interface Window {
    agentForge: {
      invoke(channel: string, args: Record<string, unknown>): Promise<unknown>;
    };
  }
}
