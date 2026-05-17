import { GitManager } from './git-manager';
import type { BrowserWindow } from 'electron';
import { EVENT_CHANNELS } from '../../ipc/event-channels';

export class WorktreeManager {
  private gitManager: GitManager;
  private mainWindow: BrowserWindow | null = null;
  private activeWorktrees: Map<string, { taskId: string; branch: string; path: string }> = new Map();

  constructor(gitManager: GitManager) {
    this.gitManager = gitManager;
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  async createForTask(projectPath: string, taskId: string): Promise<string> {
    const branchName = `agentforge/${taskId.slice(0, 8)}`;
    const worktreePath = `${projectPath}-worktree-${taskId.slice(0, 8)}`;
    await this.gitManager.createWorktree(projectPath, branchName, worktreePath);
    this.activeWorktrees.set(taskId, { taskId, branch: branchName, path: worktreePath });
    this.emitEvent('worktree_created', { taskId, branch: branchName, path: worktreePath });
    return worktreePath;
  }

  async mergeWorktree(projectPath: string, taskId: string): Promise<void> {
    const info = this.activeWorktrees.get(taskId);
    if (!info) throw new Error(`No worktree for task ${taskId}`);
    await this.gitManager.checkout(projectPath, 'main');
    await this.gitManager.createBranch(projectPath, `merge-${info.branch}`);
    this.activeWorktrees.delete(taskId);
    this.emitEvent('worktree_merged', { taskId, branch: info.branch });
  }

  async discardWorktree(projectPath: string, taskId: string): Promise<void> {
    const info = this.activeWorktrees.get(taskId);
    if (!info) throw new Error(`No worktree for task ${taskId}`);
    await this.gitManager.removeWorktree(projectPath, info.path);
    this.activeWorktrees.delete(taskId);
    this.emitEvent('worktree_discarded', { taskId, branch: info.branch });
  }

  getActiveWorktree(taskId: string): { branch: string; path: string } | undefined {
    const info = this.activeWorktrees.get(taskId);
    return info ? { branch: info.branch, path: info.path } : undefined;
  }

  private emitEvent(type: string, data: Record<string, unknown>): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(EVENT_CHANNELS.NOTIFICATION, { type, ...data });
    }
  }
}
