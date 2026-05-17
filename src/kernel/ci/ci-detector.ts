import fs from 'fs';
import path from 'path';

export interface CIWorkflow {
  name: string;
  type: 'github-actions' | 'gitlab-ci' | 'jenkins' | 'circleci';
  path: string;
  triggers?: string[];
}

export class CIDetector {
  detectCIConfigs(projectPath: string): CIWorkflow[] {
    const workflows: CIWorkflow[] = [];

    const githubActionsDir = path.join(projectPath, '.github', 'workflows');
    if (fs.existsSync(githubActionsDir)) {
      try {
        const files = fs.readdirSync(githubActionsDir);
        for (const file of files) {
          if (file.endsWith('.yml') || file.endsWith('.yaml')) {
            const workflowPath = path.join(githubActionsDir, file);
            const parsed = this.parseGitHubActions(workflowPath);
            workflows.push({
              name: parsed.name || file.replace(/\.(yml|yaml)$/, ''),
              type: 'github-actions',
              path: workflowPath,
              triggers: parsed.triggers,
            });
          }
        }
      } catch {}
    }

    const gitlabCiPath = path.join(projectPath, '.gitlab-ci.yml');
    if (fs.existsSync(gitlabCiPath)) {
      workflows.push({
        name: 'GitLab CI',
        type: 'gitlab-ci',
        path: gitlabCiPath,
      });
    }

    const jenkinsfilePath = path.join(projectPath, 'Jenkinsfile');
    if (fs.existsSync(jenkinsfilePath)) {
      workflows.push({
        name: 'Jenkins',
        type: 'jenkins',
        path: jenkinsfilePath,
      });
    }

    const circleciPath = path.join(projectPath, '.circleci', 'config.yml');
    if (fs.existsSync(circleciPath)) {
      workflows.push({
        name: 'CircleCI',
        type: 'circleci',
        path: circleciPath,
      });
    }

    return workflows;
  }

  parseGitHubActions(workflowPath: string): { name: string; triggers: string[] } {
    try {
      const content = fs.readFileSync(workflowPath, 'utf-8');
      const nameMatch = content.match(/^name:\s*(.+)$/m);
      const name = nameMatch ? nameMatch[1].trim().replace(/['"]/g, '') : '';

      const triggers: string[] = [];
      const onMatch = content.match(/^on:\s*$/m);
      if (onMatch) {
        const onSection = content.slice(onMatch.index! + onMatch[0].length);
        const lines = onSection.split('\n');
        for (const line of lines) {
          const triggerMatch = line.match(/^\s+-?\s*(\w+)/);
          if (triggerMatch) {
            triggers.push(triggerMatch[1]);
          }
          if (line && !line.match(/^\s/) && !line.match(/^on:/)) break;
        }
      } else {
        const onInlineMatch = content.match(/^on:\s*\[(.+)\]\s*$/m);
        if (onInlineMatch) {
          triggers.push(...onInlineMatch[1].split(',').map((s) => s.trim().replace(/['"]/g, '')));
        } else {
          const onSingleMatch = content.match(/^on:\s*(\w+)\s*$/m);
          if (onSingleMatch) {
            triggers.push(onSingleMatch[1]);
          }
        }
      }

      return { name, triggers };
    } catch {
      return { name: '', triggers: [] };
    }
  }
}
