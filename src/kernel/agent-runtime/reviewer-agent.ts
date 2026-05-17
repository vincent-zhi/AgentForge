import { BaseAgent } from './base-agent';
import type { Blackboard } from './blackboard';
import type { LeaseManager } from '../context-lease/lease-manager';
import { REVIEWER_PROMPT } from './prompt-templates';
import type { ChatMessage } from '../model-gateway/model-gateway';

interface ReviewFinding {
  severity: 'info' | 'warning' | 'error';
  message: string;
  file?: string;
  line?: number;
}

interface ReviewResult {
  approved: boolean;
  outOfScope: boolean;
  issues: ReviewFinding[];
}

export class ReviewerAgent extends BaseAgent {
  constructor(id: string, taskId: string, blackboard: Blackboard, leaseManager?: LeaseManager) {
    super(id, 'reviewer', taskId, blackboard, leaseManager);
  }

  async execute(): Promise<void> {
    this.publishEvent('stage_started', { stage: 'reviewer' });

    if (!this.modelGateway) {
      const defaultResult: ReviewResult = {
        approved: true,
        outOfScope: false,
        issues: [],
      };
      this.publishEvent('review_completed', { review: defaultResult });
      this.logAction('review_changes', 'diff');
      return;
    }

    const diff = this.getDiff();
    const taskCapsule = this.getTaskCapsule();
    const impactMap = this.getImpactMap();

    const messages: ChatMessage[] = [
      { role: 'system', content: REVIEWER_PROMPT },
      { role: 'user', content: `Diff:\n${diff}\n\nTask Capsule:\n${taskCapsule}\n\nImpact Map:\n${impactMap}` },
    ];

    const response = await this.modelGateway.chat(messages);
    const reviewResult = this.parseReview(response.content);

    this.publishEvent('review_completed', { review: reviewResult });
    this.logAction('review_changes', 'diff');
  }

  private getDiff(): string {
    const events = this.blackboard.getEvents(this.taskId);
    const codeEvent = events.find((e) => e.type === 'code_modified');
    if (codeEvent?.data) {
      return JSON.stringify(codeEvent.data);
    }
    return 'No code changes available for review.';
  }

  private getTaskCapsule(): string {
    const events = this.blackboard.getEvents(this.taskId);
    const specEvent = events.find((e) => e.type === 'spec_generated');
    if (specEvent?.data?.spec) {
      return JSON.stringify(specEvent.data.spec);
    }
    return 'No task capsule available.';
  }

  private getImpactMap(): string {
    const events = this.blackboard.getEvents(this.taskId);
    const impactEvent = events.find((e) => e.type === 'impact_map_generated');
    if (impactEvent?.data?.impactMap) {
      return JSON.stringify(impactEvent.data.impactMap);
    }
    return 'No impact map available.';
  }

  private parseReview(content: string): ReviewResult {
    try {
      const parsed = JSON.parse(content);
      return {
        approved: parsed.approved !== false,
        outOfScope: parsed.outOfScope === true,
        issues: Array.isArray(parsed.issues)
          ? parsed.issues.map((i: Record<string, unknown>) => ({
              severity: i.severity || 'info',
              message: String(i.message || ''),
              file: i.file ? String(i.file) : undefined,
              line: typeof i.line === 'number' ? i.line : undefined,
            }))
          : [],
      };
    } catch {
      return {
        approved: true,
        outOfScope: false,
        issues: [],
      };
    }
  }
}
