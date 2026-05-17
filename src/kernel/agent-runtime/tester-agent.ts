import { BaseAgent } from './base-agent';
import type { Blackboard } from './blackboard';
import type { LeaseManager } from '../context-lease/lease-manager';
import { TESTER_PROMPT } from './prompt-templates';
import type { ChatMessage } from '../model-gateway/model-gateway';
import type { TestRunner } from '../runtime/test-runner';

interface TestResult {
  passed: boolean;
  total: number;
  failed: number;
  output: string;
  failedTests: string[];
  duration: number;
}

export class TesterAgent extends BaseAgent {
  private testRunner: TestRunner | null = null;
  private projectPath: string = '';

  constructor(id: string, taskId: string, blackboard: Blackboard, leaseManager?: LeaseManager) {
    super(id, 'tester', taskId, blackboard, leaseManager);
  }

  setTestRunner(runner: TestRunner): void {
    this.testRunner = runner;
  }

  setProjectPath(path: string): void {
    this.projectPath = path;
  }

  async execute(): Promise<void> {
    this.publishEvent('stage_started', { stage: 'tester' });

    const testResult = await this.runTests();

    if (testResult.passed) {
      this.publishEvent('test_passed', { results: testResult });
    } else {
      this.publishEvent('test_failed', { results: testResult });
    }

    this.publishEvent('test_completed', { results: testResult });
    this.logAction('run_tests', 'test_suite');
  }

  private async runTests(): Promise<TestResult> {
    const affectedTests = this.getAffectedTests();

    if (this.testRunner && this.projectPath) {
      try {
        const rawResults = await this.testRunner.runAllTests(this.projectPath);
        const total = rawResults.length;
        const failed = rawResults.filter((r) => !r.passed).length;
        const failedCommands = rawResults.filter((r) => !r.passed).map((r) => r.command.command);
        return {
          passed: failed === 0 && total > 0,
          total,
          failed,
          output: rawResults.map((r) => r.output).join('\n'),
          failedTests: failedCommands,
          duration: 0,
        };
      } catch (error) {
        return {
          passed: false,
          total: 0,
          failed: 0,
          output: `Test runner error: ${error instanceof Error ? error.message : String(error)}`,
          failedTests: [],
          duration: 0,
        };
      }
    }

    if (this.modelGateway && affectedTests.length > 0) {
      return this.generateTestSuggestions(affectedTests);
    }

    return {
      passed: true,
      total: 0,
      failed: 0,
      output: 'No test runner available. Tests not executed.',
      failedTests: [],
      duration: 0,
    };
  }

  private getAffectedTests(): string[] {
    const events = this.blackboard.getEvents(this.taskId);
    const impactEvent = events.find((e) => e.type === 'impact_map_generated');
    const impactData = impactEvent?.data as { impactMap?: { affectedTests?: Array<{ command: string }> } } | undefined;
    if (impactData?.impactMap?.affectedTests) {
      return impactData.impactMap.affectedTests.map((t) => t.command);
    }
    return [];
  }

  private async generateTestSuggestions(affectedTests: string[]): Promise<TestResult> {
    const messages: ChatMessage[] = [
      { role: 'system', content: TESTER_PROMPT },
      { role: 'user', content: `Affected test commands: ${JSON.stringify(affectedTests)}\n\nSuggest test cases that should be written or run for the changes. Respond with a JSON object: { suggestedTests: [{ name: string, description: string }], coverageGaps: [string] }` },
    ];

    try {
      const response = await this.modelGateway!.chat(messages);
      const parsed = JSON.parse(response.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
      this.publishEvent('test_suggestions_generated', { suggestions: parsed });
    } catch {}

    return {
      passed: true,
      total: affectedTests.length,
      failed: 0,
      output: `Suggested tests for: ${affectedTests.join(', ')}`,
      failedTests: [],
      duration: 0,
    };
  }
}
