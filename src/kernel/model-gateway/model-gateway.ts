import { SettingsService } from '../settings/settings-service';
import { ModelPermissionPolicy } from '../../types/core';
import { PolicyManager } from '../security/policy-manager';

export class PermissionDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}

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
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
  model?: string;
  contextFilePaths?: string[];
  taskId?: string;
}

const THIRD_PARTY_PROVIDERS = new Set(['openai', 'anthropic']);

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_RETRIES = 3;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

export class OpenAIProvider implements ModelProvider {
  name = 'openai';
  private model: string;
  private settingsService: SettingsService;

  constructor(settingsService: SettingsService, model = 'gpt-4') {
    this.model = model;
    this.settingsService = settingsService;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const apiKey = await this.settingsService.get('openaiApiKey');
    if (!apiKey) throw new Error('OpenAI API key not configured');

    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetchWithTimeout(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: this.model,
              messages: messages.map((m) => ({ role: m.role, content: m.content })),
              temperature: options?.temperature ?? 0.2,
              max_tokens: options?.maxTokens ?? 4096,
            }),
          },
          timeoutMs,
        );

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
        }

        const data = await response.json() as {
          choices: Array<{ message: { content: string } }>;
          model: string;
          usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
        };

        return {
          content: data.choices[0]?.message?.content ?? '',
          model: data.model,
          usage: {
            promptTokens: data.usage?.prompt_tokens ?? 0,
            completionTokens: data.usage?.completion_tokens ?? 0,
            totalTokens: data.usage?.total_tokens ?? 0,
          },
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxRetries - 1) {
          await sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }
    throw lastError;
  }
}

export class AnthropicProvider implements ModelProvider {
  name = 'anthropic';
  private model: string;
  private settingsService: SettingsService;

  constructor(settingsService: SettingsService, model = 'claude-3-sonnet-20240229') {
    this.model = model;
    this.settingsService = settingsService;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const apiKey = await this.settingsService.get('anthropicApiKey');
    if (!apiKey) throw new Error('Anthropic API key not configured');

    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;

    const systemMessage = messages.find((m) => m.role === 'system');
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const body: Record<string, unknown> = {
          model: this.model,
          messages: nonSystemMessages.map((m) => ({ role: m.role, content: m.content })),
          max_tokens: options?.maxTokens ?? 4096,
        };
        if (systemMessage) {
          body.system = systemMessage.content;
        }

        const response = await fetchWithTimeout(
          'https://api.anthropic.com/v1/messages',
          {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          },
          timeoutMs,
        );

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Anthropic API error ${response.status}: ${errorBody}`);
        }

        const data = await response.json() as {
          content: Array<{ type: string; text: string }>;
          model: string;
          usage: { input_tokens: number; output_tokens: number };
        };

        const textContent = data.content
          .filter((block) => block.type === 'text')
          .map((block) => block.text)
          .join('');

        return {
          content: textContent,
          model: data.model,
          usage: {
            promptTokens: data.usage?.input_tokens ?? 0,
            completionTokens: data.usage?.output_tokens ?? 0,
            totalTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
          },
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxRetries - 1) {
          await sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }
    throw lastError;
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
  private currentTaskId: string = '';
  private taskCosts: Map<string, number> = new Map();
  private policyManager: PolicyManager;
  onAudit?: (data: { action: string; model: string; tokens: { promptTokens: number; completionTokens: number; totalTokens: number }; cost: number; timestamp: string }) => void;

  constructor(providers?: ModelProvider[], defaultProvider?: string) {
    if (providers) {
      for (const provider of providers) {
        this.providers.set(provider.name, provider);
      }
    }
    this.defaultProvider = defaultProvider || (this.providers.size > 0 ? this.providers.keys().next().value! : 'openai');
    this.policyManager = new PolicyManager();
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

  setCurrentTask(taskId: string): void {
    this.currentTaskId = taskId;
  }

  async chat(messages: ChatMessage[], providerName?: string, options?: ChatOptions): Promise<ChatResponse> {
    const name = providerName || this.defaultProvider;
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider ${name} not found`);
    }

    const policy: ModelPermissionPolicy = await this.policyManager.getModelPermissionPolicy();
    const requestedModel = options?.model ?? '';
    const taskId = options?.taskId ?? this.currentTaskId;
    const contextFilePaths = options?.contextFilePaths ?? [];

    if (policy.allowedModels.length > 0 && requestedModel && !policy.allowedModels.includes(requestedModel)) {
      throw new PermissionDeniedError(`Model '${requestedModel}' is not in the allowed list`);
    }

    if (policy.localOnlyPaths.length > 0 && contextFilePaths.length > 0) {
      const hasLocalOnlyPath = contextFilePaths.some((fp) =>
        policy.localOnlyPaths.some((pattern) => {
          if (pattern === fp) return true;
          const regexStr = pattern
            .replace(/\./g, '\\.')
            .replace(/\*\*/g, '{{DOUBLESTAR}}')
            .replace(/\*/g, '[^/]*')
            .replace(/{{DOUBLESTAR}}/g, '.*');
          try {
            return new RegExp(`^${regexStr}$`).test(fp);
          } catch {
            return pattern === fp;
          }
        })
      );
      if (hasLocalOnlyPath && THIRD_PARTY_PROVIDERS.has(name)) {
        throw new PermissionDeniedError(`Task involves local-only paths; third-party provider '${name}' is not allowed`);
      }
    }

    const currentCost = this.taskCosts.get(taskId) ?? 0;
    if (currentCost >= policy.maxCostPerTask) {
      throw new PermissionDeniedError(`Task '${taskId}' has exceeded the maximum cost of $${policy.maxCostPerTask}`);
    }

    if (!policy.allowThirdParty && THIRD_PARTY_PROVIDERS.has(name)) {
      throw new PermissionDeniedError(`Third-party providers are not allowed; provider '${name}' is restricted`);
    }

    const response = await provider.chat(messages, options);
    this.trackCost(this.currentTaskId, response.model, response.usage.totalTokens);

    const estimatedCost = (response.usage.totalTokens / 1000) * 0.002;
    this.trackTaskCost(taskId, estimatedCost);

    if (this.onAudit) {
      this.onAudit({
        action: 'llm_call',
        model: response.model,
        tokens: response.usage,
        cost: response.usage.totalTokens,
        timestamp: new Date().toISOString(),
      });
    }

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

  trackTaskCost(taskId: string, cost: number): void {
    const current = this.taskCosts.get(taskId) ?? 0;
    this.taskCosts.set(taskId, current + cost);
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
