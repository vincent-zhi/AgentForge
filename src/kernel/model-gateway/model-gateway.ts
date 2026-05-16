export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export interface ModelProvider {
  name: string;
  chat(messages: ChatMessage[]): Promise<ChatResponse>;
}

export class OpenAIProvider implements ModelProvider {
  name = 'openai';
  private model: string;

  constructor(_apiKey: string, model = 'gpt-4') {
    this.model = model;
  }

  async chat(_messages: ChatMessage[]): Promise<ChatResponse> {
    return {
      content: '',
      model: this.model,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    };
  }
}

export class AnthropicProvider implements ModelProvider {
  name = 'anthropic';
  private model: string;

  constructor(_apiKey: string, model = 'claude-3-sonnet-20240229') {
    this.model = model;
  }

  async chat(_messages: ChatMessage[]): Promise<ChatResponse> {
    return {
      content: '',
      model: this.model,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    };
  }
}

interface CostRecord {
  taskId: string;
  model: string;
  tokens: number;
  timestamp: string;
}

export class ModelGateway {
  private providers: Map<string, ModelProvider> = new Map();
  private defaultProvider: string;
  private costRecords: CostRecord[] = [];

  constructor(providers?: ModelProvider[], defaultProvider?: string) {
    if (providers) {
      for (const provider of providers) {
        this.providers.set(provider.name, provider);
      }
    }
    this.defaultProvider = defaultProvider || (this.providers.size > 0 ? this.providers.keys().next().value! : 'openai');
  }

  addProvider(provider: ModelProvider): void {
    this.providers.set(provider.name, provider);
    if (this.providers.size === 1) {
      this.defaultProvider = provider.name;
    }
  }

  removeProvider(name: string): void {
    this.providers.delete(name);
    if (this.defaultProvider === name && this.providers.size > 0) {
      this.defaultProvider = this.providers.keys().next().value!;
    }
  }

  async chat(messages: ChatMessage[], providerName?: string): Promise<ChatResponse> {
    const name = providerName || this.defaultProvider;
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider ${name} not found`);
    }
    const response = await provider.chat(messages);
    this.trackCost('', response.model, response.usage.totalTokens);
    return response;
  }

  trackCost(taskId: string, model: string, tokens: number): void {
    this.costRecords.push({
      taskId,
      model,
      tokens,
      timestamp: new Date().toISOString(),
    });
  }

  getCostForTask(taskId: string): { totalTokens: number; byModel: Record<string, number> } {
    const records = this.costRecords.filter((r) => r.taskId === taskId);
    const byModel: Record<string, number> = {};
    let totalTokens = 0;
    for (const record of records) {
      totalTokens += record.tokens;
      byModel[record.model] = (byModel[record.model] || 0) + record.tokens;
    }
    return { totalTokens, byModel };
  }

  getProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  getDefaultProvider(): string {
    return this.defaultProvider;
  }
}
