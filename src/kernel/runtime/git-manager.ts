import simpleGit, { SimpleGit } from 'simple-git';

interface GitStatusResult {
  branch: string;
  staged: string[];
  modified: string[];
  untracked: string[];
}

interface GitLogEntry {
  hash: string;
  message: string;
  date: string;
}

interface WorktreeInfo {
  path: string;
  branch: string;
  isCurrent: boolean;
}

export class GitManager {
  private gitInstances: Map<string, SimpleGit> = new Map();

  private getGit(projectPath: string): SimpleGit {
    if (!this.gitInstances.has(projectPath)) {
      this.gitInstances.set(projectPath, simpleGit(projectPath));
    }
    return this.gitInstances.get(projectPath)!;
  }

  async getStatus(projectPath: string): Promise<GitStatusResult> {
    const git = this.getGit(projectPath);
    const status = await git.status();

    return {
      branch: status.current || 'HEAD',
      staged: status.staged,
      modified: status.modified,
      untracked: status.not_added,
    };
  }

  async getDiff(projectPath: string): Promise<string> {
    const git = this.getGit(projectPath);
    return git.diff();
  }

  async commit(projectPath: string, message: string): Promise<string> {
    const git = this.getGit(projectPath);
    const result = await git.commit(message);
    return result.commit;
  }

  async createBranch(projectPath: string, branchName: string): Promise<string> {
    const git = this.getGit(projectPath);
    await git.checkoutLocalBranch(branchName);
    return branchName;
  }

  async checkout(projectPath: string, branchName: string): Promise<string> {
    const git = this.getGit(projectPath);
    await git.checkout(branchName);
    return branchName;
  }

  async createWorktree(projectPath: string, branchName: string, worktreePath: string): Promise<string> {
    const git = this.getGit(projectPath);
    await git.raw(['worktree', 'add', worktreePath, branchName]);
    return worktreePath;
  }

  async removeWorktree(projectPath: string, worktreePath: string): Promise<string> {
    const git = this.getGit(projectPath);
    await git.raw(['worktree', 'remove', worktreePath]);
    return worktreePath;
  }

  async getLog(projectPath: string, maxCount: number = 50): Promise<GitLogEntry[]> {
    const git = this.getGit(projectPath);
    const log = await git.log(['--max-count', String(maxCount)]);

    return log.all.map((entry) => ({
      hash: entry.hash,
      message: entry.message,
      date: entry.date,
    }));
  }

  async listWorktrees(projectPath: string): Promise<WorktreeInfo[]> {
    const git = this.getGit(projectPath);
    const output = await git.raw(['worktree', 'list', '--porcelain']);
    const worktrees: WorktreeInfo[] = [];
    let currentPath = '';
    let currentBranch = '';
    let isCurrent = false;

    for (const line of output.split('\n')) {
      if (line.startsWith('worktree ')) {
        if (currentPath) {
          worktrees.push({ path: currentPath, branch: currentBranch, isCurrent });
        }
        currentPath = line.substring('worktree '.length);
        isCurrent = false;
      } else if (line.startsWith('branch ')) {
        currentBranch = line.substring('branch '.length).replace('refs/heads/', '');
      } else if (line === 'bare') {
        isCurrent = true;
      }
    }

    if (currentPath) {
      worktrees.push({ path: currentPath, branch: currentBranch, isCurrent });
    }

    return worktrees;
  }
}
