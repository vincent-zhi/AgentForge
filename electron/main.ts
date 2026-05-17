import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { IPC_CHANNELS } from '../src/ipc/channels';
import { initializeKernel, kernelServices } from '../src/kernel/index';
import { createApplicationMenu } from './menu';
import { SettingsService } from '../src/kernel/settings/settings-service';
import { WorkflowController } from '../src/kernel/workflow/workflow-controller';
import { WorktreeManager } from '../src/kernel/runtime/worktree-manager';
import { classifyTask } from '../src/kernel/workflow/task-classifier';
import { OpenAIProvider, AnthropicProvider } from '../src/kernel/model-gateway/model-gateway';
import { PackageManagerAdapter } from '../src/kernel/runtime/package-manager';
import { CIDetector } from '../src/kernel/ci/ci-detector';
import { ADRManager } from '../src/kernel/project-brain/adr-manager';
import { PolicyManager } from '../src/kernel/security/policy-manager';
import { LspBridge } from '../src/kernel/lsp/lsp-bridge';
import { generateCommitMessage } from '../src/kernel/delivery/commit-generator';
import { generatePrDescription } from '../src/kernel/delivery/pr-generator';
import { createPullRequest } from '../src/kernel/delivery/pr-creator';
import { getFileSymbols, getWorkspaceSymbols } from '../src/kernel/lsp/symbol-provider';
import { FactGovernor } from '../src/kernel/memory-governance/fact-governor';
import { DebugBridge } from '../src/kernel/debug/debug-bridge';
import { SandboxRunner } from '../src/kernel/sandbox/sandbox-runner';

let mainWindow: BrowserWindow | null = null;
let settingsService: SettingsService | null = null;
let workflowController: WorkflowController | null = null;

const GITIGNORE_PATTERNS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.nuxt',
  'coverage', '.cache', '.vscode', '.idea', '__pycache__',
  '.terraform', 'vendor', '.venv', 'venv', '.DS_Store',
  '.turbo', '.vercel', '.husky', '.changeset',
]);

interface FileTreeNode {
  id: string;
  label: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
  path: string;
  size?: number;
}

function buildFileTree(rootPath: string): FileTreeNode | null {
  if (!fs.existsSync(rootPath)) return null;

  const rootName = path.basename(rootPath);
  const root: FileTreeNode = {
    id: rootPath,
    label: rootName,
    type: 'directory',
    path: '',
    children: [],
  };

  function walk(dir: string, relativePath: string, parentNode: FileTreeNode): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    const dirs: fs.Dirent[] = [];
    const files: fs.Dirent[] = [];

    for (const entry of entries) {
      if (GITIGNORE_PATTERNS.has(entry.name) || entry.name.startsWith('.')) continue;
      if (entry.isDirectory()) {
        dirs.push(entry);
      } else if (entry.isFile()) {
        files.push(entry);
      }
    }

    dirs.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));

    for (const dirEntry of dirs) {
      const childRelative = relativePath ? `${relativePath}/${dirEntry.name}` : dirEntry.name;
      const childFullPath = path.join(dir, dirEntry.name);
      const childNode: FileTreeNode = {
        id: childFullPath,
        label: dirEntry.name,
        type: 'directory',
        path: childRelative,
        children: [],
      };
      parentNode.children!.push(childNode);
      walk(childFullPath, childRelative, childNode);
    }

    for (const fileEntry of files) {
      const childRelative = relativePath ? `${relativePath}/${fileEntry.name}` : fileEntry.name;
      const childFullPath = path.join(dir, fileEntry.name);
      let size: number | undefined;
      try {
        size = fs.statSync(childFullPath).size;
      } catch {}
      const childNode: FileTreeNode = {
        id: childFullPath,
        label: fileEntry.name,
        type: 'file',
        path: childRelative,
        size,
      };
      parentNode.children!.push(childNode);
    }
  }

  walk(rootPath, '', root);
  return root;
}

let worktreeManager: WorktreeManager | null = null;
let lspBridge: LspBridge | null = null;
let debugBridge: DebugBridge | null = null;
let sandboxRunner: SandboxRunner | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#0B0D10',
    title: 'AgentForge',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    kernelServices.brainService.stopWatching();
    mainWindow = null;
  });

  createApplicationMenu(mainWindow);

  autoUpdater.autoDownload = false;
  autoUpdater.checkForUpdates();

  autoUpdater.on('update-available', (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:available', info);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:downloaded', info);
    }
  });
}

function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.PROJECT.OPEN, async () => {
    try {
      const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
      return result;
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT.SCAN, async (_event, args: { projectPath: string }) => {
    try {
      return await kernelServices.brainService.initializeProject(args.projectPath);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT.CLOSE, async () => {
    try {
      kernelServices.brainService.stopWatching();
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT.GET_FACTS, async (_event, args: { filters?: { module?: string; type?: string; confidence?: string } }) => {
    try {
      return kernelServices.brainService.getFacts(args.filters);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT.SEARCH_FACTS, async (_event, args: { query: string }) => {
    try {
      return kernelServices.brainService.searchFacts(args.query);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT.GET_MODULES, async () => {
    try {
      return kernelServices.brainService.getModules();
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT.GET_DEPENDENCY_GRAPH, async () => {
    try {
      const graph = kernelServices.brainService.getDependencyGraph();
      if (!graph) return null;
      return Object.fromEntries(graph);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT.GET_FILE_TREE, async (_event, args: { projectPath: string }) => {
    try {
      return buildFileTree(args.projectPath);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT.UPDATE_FACT_STATUS, async (_event, args: { factId: string; status: string }) => {
    try {
      kernelServices.brainService.updateFactStatus(args.factId, args.status as any);
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT.REFRESH_FACT, async (_event, args: { factId: string }) => {
    try {
      const facts = kernelServices.brainService.getFacts();
      const fact = facts.find((f: any) => f.id === args.factId);
      if (fact) {
        kernelServices.brainService.updateFactStatus(args.factId, 'active' as any);
        return { success: true };
      }
      return { error: `Fact not found: ${args.factId}` };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT.SWITCH, async (_event, args: { projectPath: string }) => {
    try {
      const result = await kernelServices.brainService.initializeProject(args.projectPath);
      return result;
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT.GET_RECENT, async () => {
    try {
      if (!settingsService) settingsService = new SettingsService();
      const data = await settingsService.get('recentProjects');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT.SAVE_RECENT, async (_event, args: { projects: string }) => {
    try {
      if (!settingsService) settingsService = new SettingsService();
      await settingsService.set('recentProjects', args.projects);
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.IMPACT.ANALYZE, async (_event, args: { taskId: string; targetFiles: string[] }) => {
    try {
      return kernelServices.guardEngine.analyzeImpact(args.taskId, args.targetFiles as any);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.IMPACT.GET_MAP, async (_event, args: { taskId: string }) => {
    try {
      return kernelServices.guardEngine.getImpactMap(args.taskId);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.IMPACT.COMPARE_PLANNED_VS_ACTUAL, async (_event, args: { taskId: string }) => {
    try {
      return kernelServices.guardEngine.comparePlannedVsActual(args.taskId);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.TASK.CREATE, async (_event, args: { goal: string }) => {
    try {
      return kernelServices.capsuleCompiler.compileTask(args.goal);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.TASK.GET_CAPSULE, async (_event, args: { taskId: string }) => {
    try {
      return kernelServices.taskCapsuleRepo.findById(args.taskId);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.TASK.UPDATE_STATUS, async (_event, args: { taskId: string; status: string }) => {
    try {
      kernelServices.taskCapsuleRepo.updateStatus(args.taskId, args.status as any);
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.TASK.LIST, async () => {
    try {
      return kernelServices.taskCapsuleRepo.findAll();
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.AGENT.START, async (_event, args: { taskId: string }) => {
    try {
      const capsule = kernelServices.taskCapsuleRepo.findById(args.taskId);
      if (!capsule) {
        return { error: `Task capsule not found: ${args.taskId}` };
      }
      await kernelServices.agentRuntime.startTask(capsule);
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.AGENT.STOP, async (_event, args: { taskId: string }) => {
    try {
      kernelServices.agentRuntime.stopTask(args.taskId);
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.AGENT.GET_STATUS, async (_event, args: { taskId: string }) => {
    try {
      return kernelServices.agentRuntime.getStatus(args.taskId);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.AGENT.GET_TIMELINE, async (_event, args: { taskId: string }) => {
    try {
      return kernelServices.agentRuntime.getTimeline(args.taskId);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.AGENT.GET_LEASES, async (_event, args: { taskId: string }) => {
    try {
      return kernelServices.leaseManager.getLeasesForTask(args.taskId);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.EVIDENCE.GET_STACK, async (_event, args: { taskId: string }) => {
    try {
      return kernelServices.evidencePipeline.getEvidenceStack(args.taskId);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.EVIDENCE.GET_TEST_RESULTS, async (_event, args: { taskId: string }) => {
    try {
      return kernelServices.evidencePipeline.getTestResults(args.taskId);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.REVIEW.GENERATE_PACKET, async (_event, args: { taskId: string }) => {
    try {
      const capsule = kernelServices.taskCapsuleRepo.findById(args.taskId);
      if (!capsule) {
        return { error: `Task capsule not found: ${args.taskId}` };
      }
      const impactMap = kernelServices.guardEngine.getImpactMap(args.taskId);
      const evidenceEntries = kernelServices.evidencePipeline.getEvidenceStack(args.taskId);
      return kernelServices.packetGenerator.generatePacket(
        args.taskId,
        capsule,
        impactMap || {
          taskId: args.taskId,
          target: { module: '', files: [] },
          upstreamDependencies: [],
          downstreamDependents: [],
          contractsTouched: [],
          affectedTests: [],
          forbiddenChanges: [],
          risk: { level: 'low', reasons: [] },
          reviewFocus: [],
          plannedImpactHash: '',
        },
        evidenceEntries,
        [],
        [],
      );
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.REVIEW.SAFE_APPLY_CHECK, async (_event, args: { taskId: string }) => {
    try {
      const capsule = kernelServices.taskCapsuleRepo.findById(args.taskId);
      if (!capsule) {
        return { error: `Task capsule not found: ${args.taskId}` };
      }
      const impactMap = kernelServices.guardEngine.getImpactMap(args.taskId);
      const evidenceEntries = kernelServices.evidencePipeline.getEvidenceStack(args.taskId);
      const packet = kernelServices.packetGenerator.generatePacket(
        args.taskId,
        capsule,
        impactMap || {
          taskId: args.taskId,
          target: { module: '', files: [] },
          upstreamDependencies: [],
          downstreamDependents: [],
          contractsTouched: [],
          affectedTests: [],
          forbiddenChanges: [],
          risk: { level: 'low', reasons: [] },
          reviewFocus: [],
          plannedImpactHash: '',
        },
        evidenceEntries,
        [],
        [],
      );
      return kernelServices.applyGate.runSafeApplyChecks(args.taskId, packet);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.REVIEW.APPLY, async () => {
    try {
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GIT.STATUS, async (_event, args: { projectPath: string }) => {
    try {
      return await kernelServices.gitManager.getStatus(args.projectPath);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GIT.DIFF, async (_event, args: { projectPath: string }) => {
    try {
      return await kernelServices.gitManager.getDiff(args.projectPath);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GIT.COMMIT, async (_event, args: { projectPath: string; message: string }) => {
    try {
      return await kernelServices.gitManager.commit(args.projectPath, args.message);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GIT.LIST_WORKTREES, async (_event, args: { projectPath: string }) => {
    try {
      return await kernelServices.gitManager.listWorktrees(args.projectPath);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GIT.CREATE_WORKTREE, async (_event, args: { projectPath: string; branchName: string; worktreePath: string }) => {
    try {
      return await kernelServices.gitManager.createWorktree(args.projectPath, args.branchName, args.worktreePath);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GIT.REMOVE_WORKTREE, async (_event, args: { projectPath: string; worktreePath: string }) => {
    try {
      return await kernelServices.gitManager.removeWorktree(args.projectPath, args.worktreePath);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.RUNTIME.EXECUTE_COMMAND, async (_event, args: { command: string; cwd?: string }) => {
    try {
      return await kernelServices.terminalManager.executeCommand(args.command, args.cwd);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.RUNTIME.RUN_TESTS, async (_event, args: { projectPath: string }) => {
    try {
      return await kernelServices.testRunner.runAllTests(args.projectPath);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.FILE.READ, async (_event, args: { filePath: string }) => {
    try {
      return await fs.promises.readFile(args.filePath, 'utf-8');
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.FILE.WRITE, async (_event, args: { filePath: string; content: string }) => {
    try {
      await fs.promises.writeFile(args.filePath, args.content, 'utf-8');
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS.GET, async (_event, args: { key: string }) => {
    try {
      if (!settingsService) settingsService = new SettingsService();
      return await settingsService.get(args.key);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS.SET, async (_event, args: { key: string; value: string }) => {
    try {
      if (!settingsService) settingsService = new SettingsService();
      await settingsService.set(args.key, args.value);
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS.GET_ALL, async () => {
    try {
      if (!settingsService) settingsService = new SettingsService();
      return await settingsService.getAll();
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS.DELETE, async (_event, args: { key: string }) => {
    try {
      if (!settingsService) settingsService = new SettingsService();
      await settingsService.delete(args.key);
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.WORKFLOW.START, async (_event, args: { goal: string }) => {
    try {
      if (!workflowController) throw new Error('WorkflowController not initialized');
      const capsule = await workflowController.start(args.goal);
      return capsule;
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.WORKFLOW.CONFIRM, async (_event, args: { taskId: string }) => {
    try {
      if (!workflowController) throw new Error('WorkflowController not initialized');
      await workflowController.confirmAndExecute(args.taskId);
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.WORKFLOW.COMPLETE, async (_event, args: { taskId: string; action: 'apply' | 'discard' }) => {
    try {
      if (!workflowController) throw new Error('WorkflowController not initialized');
      await workflowController.completeTask(args.taskId, args.action);
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.WORKFLOW.GET_STATUS, async () => {
    try {
      if (!workflowController) throw new Error('WorkflowController not initialized');
      return {
        currentStep: workflowController.getCurrentStep(),
        currentTaskId: workflowController.getCurrentTaskId(),
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.WORKFLOW.MERGE_WORKTREE, async (_event, args: { projectPath: string; taskId: string }) => {
    try {
      if (!worktreeManager) throw new Error('WorktreeManager not initialized');
      await worktreeManager.mergeWorktree(args.projectPath, args.taskId);
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.WORKFLOW.DISCARD_WORKTREE, async (_event, args: { projectPath: string; taskId: string }) => {
    try {
      if (!worktreeManager) throw new Error('WorktreeManager not initialized');
      await worktreeManager.discardWorktree(args.projectPath, args.taskId);
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.WORKFLOW.CLASSIFY, async (_event, args: { goal: string }) => {
    try {
      return classifyTask(args.goal);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SEARCH.SEARCH, async (_event, args: { query: string; options: { regex?: boolean; caseSensitive?: boolean; wholeWord?: boolean; fileFilter?: string; projectPath: string } }) => {
    try {
      const { query, options } = args;
      const results: Array<{ file: string; line: number; lineText: string; matchStart: number; matchEnd: number }> = [];

      let grepCmd: string;
      const fileFilterArgs = options.fileFilter
        ? options.fileFilter.split(',').map((f: string) => `--glob=${f.trim()}`).join(' ')
        : '';

      if (process.platform === 'win32') {
        return results;
      }

      grepCmd = 'grep -rn';
      if (!options.caseSensitive) grepCmd += ' -i';
      if (options.wholeWord) grepCmd += ' -w';
      if (options.regex) {
        grepCmd += ' -E';
      }

      const escapedQuery = query.replace(/'/g, "'\\''");
      grepCmd += ` ${fileFilterArgs} -- '${escapedQuery}' '${options.projectPath}' 2>/dev/null || true`;

      try {
        const output = execSync(grepCmd, { encoding: 'utf-8', timeout: 30000, maxBuffer: 10 * 1024 * 1024 });
        const lines = output.split('\n').filter(Boolean);
        for (const line of lines.slice(0, 500)) {
          const match = line.match(/^(.+?):(\d+):(.*)$/);
          if (match) {
            const filePath = match[1];
            const lineNum = parseInt(match[2], 10);
            const lineText = match[3];
            const lineLower = lineText.toLowerCase();
            const queryLower = query.toLowerCase();
            const matchIndex = options.caseSensitive ? lineText.indexOf(query) : lineLower.indexOf(queryLower);
            results.push({
              file: filePath,
              line: lineNum,
              lineText: lineText.slice(0, 200),
              matchStart: Math.max(0, matchIndex),
              matchEnd: Math.max(0, matchIndex) + query.length,
            });
          }
        }
      } catch {
        // grep returns non-zero when no matches
      }

      return results;
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SEARCH.REPLACE_IN_FILE, async (_event, args: { filePath: string; search: string; replace: string; regex?: boolean }) => {
    try {
      const content = await fs.promises.readFile(args.filePath, 'utf-8');
      let newContent: string;
      if (args.regex) {
        const re = new RegExp(args.search, 'g');
        newContent = content.replace(re, args.replace);
      } else {
        newContent = content.split(args.search).join(args.replace);
      }
      await fs.promises.writeFile(args.filePath, newContent, 'utf-8');
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  const packageManager = new PackageManagerAdapter();

  ipcMain.handle(IPC_CHANNELS.PACKAGE.DETECT, async (_event, args: { projectPath: string }) => {
    try {
      const pm = packageManager.detectPackageManager(args.projectPath);
      return { packageManager: pm };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PACKAGE.INSTALL, async (_event, args: { projectPath: string }) => {
    try {
      return await packageManager.install(args.projectPath);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PACKAGE.RUN_SCRIPT, async (_event, args: { projectPath: string; script: string }) => {
    try {
      return await packageManager.runScript(args.projectPath, args.script);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  const ciDetector = new CIDetector();

  ipcMain.handle(IPC_CHANNELS.CI.DETECT, async (_event, args: { projectPath: string }) => {
    try {
      return ciDetector.detectCIConfigs(args.projectPath);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.CI.GET_WORKFLOWS, async (_event, args: { projectPath: string }) => {
    try {
      return ciDetector.detectCIConfigs(args.projectPath);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DELIVERY.GENERATE_COMMIT, async (_event, args: { taskId: string }) => {
    try {
      const capsule = kernelServices.taskCapsuleRepo.findById(args.taskId);
      if (!capsule) {
        return { error: `Task capsule not found: ${args.taskId}` };
      }
      const impactMap = kernelServices.guardEngine.getImpactMap(args.taskId);
      const evidenceEntries = kernelServices.evidencePipeline.getEvidenceStack(args.taskId);
      const packet = kernelServices.packetGenerator.generatePacket(
        args.taskId,
        capsule,
        impactMap || {
          taskId: args.taskId,
          target: { module: '', files: [] },
          upstreamDependencies: [],
          downstreamDependents: [],
          contractsTouched: [],
          affectedTests: [],
          forbiddenChanges: [],
          risk: { level: 'low', reasons: [] },
          reviewFocus: [],
          plannedImpactHash: '',
        },
        evidenceEntries,
        [],
        [],
      );
      return generateCommitMessage(packet);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DELIVERY.GENERATE_PR, async (_event, args: { taskId: string }) => {
    try {
      const capsule = kernelServices.taskCapsuleRepo.findById(args.taskId);
      if (!capsule) {
        return { error: `Task capsule not found: ${args.taskId}` };
      }
      const impactMap = kernelServices.guardEngine.getImpactMap(args.taskId);
      const evidenceEntries = kernelServices.evidencePipeline.getEvidenceStack(args.taskId);
      const packet = kernelServices.packetGenerator.generatePacket(
        args.taskId,
        capsule,
        impactMap || {
          taskId: args.taskId,
          target: { module: '', files: [] },
          upstreamDependencies: [],
          downstreamDependents: [],
          contractsTouched: [],
          affectedTests: [],
          forbiddenChanges: [],
          risk: { level: 'low', reasons: [] },
          reviewFocus: [],
          plannedImpactHash: '',
        },
        evidenceEntries,
        [],
        [],
      );
      return generatePrDescription(packet);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DELIVERY.CREATE_PR, async (_event, args: { projectPath: string; branchName: string; prInfo: { title: string; body: string; labels: string[]; reviewers: string[] } }) => {
    try {
      return await createPullRequest(args.projectPath, args.branchName, args.prInfo);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.LSP.INITIALIZE, async (_event, args: { projectPath: string }) => {
    try {
      lspBridge = new LspBridge();
      await lspBridge.initialize(args.projectPath);
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.LSP.COMPLETIONS, async (_event, args: { filePath: string; line: number; char: number }) => {
    try {
      if (!lspBridge) return [];
      return await lspBridge.getCompletions(args.filePath, args.line, args.char);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.LSP.DIAGNOSTICS, async (_event, args: { filePath: string }) => {
    try {
      if (!lspBridge) return [];
      return await lspBridge.getDiagnostics(args.filePath);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.LSP.DEFINITION, async (_event, args: { filePath: string; line: number; char: number }) => {
    try {
      if (!lspBridge) return null;
      return await lspBridge.getDefinition(args.filePath, args.line, args.char);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.LSP.REFERENCES, async (_event, args: { filePath: string; line: number; char: number }) => {
    try {
      if (!lspBridge) return [];
      return await lspBridge.getReferences(args.filePath, args.line, args.char);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.LSP.HOVER, async (_event, args: { filePath: string; line: number; char: number }) => {
    try {
      if (!lspBridge) return null;
      return await lspBridge.getHover(args.filePath, args.line, args.char);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.LSP.SYMBOLS, async (_event, args: { filePath: string }) => {
    try {
      return getFileSymbols(args.filePath);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.LSP.WORKSPACE_SYMBOLS, async (_event, args: { projectPath: string; query: string }) => {
    try {
      return getWorkspaceSymbols(args.projectPath, args.query);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  const factGovernor = new FactGovernor();

  ipcMain.handle(IPC_CHANNELS.MEMORY.GENERATE_PROPOSALS, async (_event, args: { taskId: string }) => {
    try {
      const capsule = kernelServices.taskCapsuleRepo.findById(args.taskId);
      if (!capsule) {
        return { error: `Task capsule not found: ${args.taskId}` };
      }
      const impactMap = kernelServices.guardEngine.getImpactMap(args.taskId);
      const changedFiles = impactMap
        ? impactMap.target.files.map((file) => ({
            path: file,
            intent: 'business_fix',
            additions: 0,
            deletions: 0,
          }))
        : [];
      return factGovernor.generateUpdateProposals(args.taskId, changedFiles, impactMap || {
        taskId: args.taskId,
        target: { module: '', files: [] },
        upstreamDependencies: [],
        downstreamDependents: [],
        contractsTouched: [],
        affectedTests: [],
        forbiddenChanges: [],
        risk: { level: 'low', reasons: [] },
        reviewFocus: [],
        plannedImpactHash: '',
      });
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.MEMORY.APPLY_PROPOSAL, async (_event, args: { proposal: any }) => {
    try {
      factGovernor.applyProposal(args.proposal);
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.MEMORY.REJECT_PROPOSAL, async (_event, args: { proposalId: string }) => {
    try {
      factGovernor.rejectProposal(args.proposalId);
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  if (!debugBridge) {
    debugBridge = new DebugBridge();
    debugBridge.on('session-started', (session) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('debug:event', { type: 'session-started', session });
      }
    });
    debugBridge.on('session-stopped', (session) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('debug:event', { type: 'session-stopped', session });
      }
    });
    debugBridge.on('resumed', (session) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('debug:event', { type: 'resumed', session });
      }
    });
    debugBridge.on('breakpoint-set', (data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('debug:event', { type: 'breakpoint-set', ...data });
      }
    });
    debugBridge.on('output', (data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('debug:event', { type: 'output', ...data });
      }
    });
  }

  ipcMain.handle(IPC_CHANNELS.DEBUG.START, async (_event, args: { projectPath: string; filePath: string }) => {
    try {
      if (!debugBridge) debugBridge = new DebugBridge();
      return debugBridge.startSession(args.projectPath, args.filePath);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DEBUG.STOP, async (_event, args: { sessionId: string }) => {
    try {
      if (!debugBridge) return { error: 'DebugBridge not initialized' };
      debugBridge.stopSession(args.sessionId);
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DEBUG.SET_BREAKPOINT, async (_event, args: { sessionId: string; filePath: string; line: number }) => {
    try {
      if (!debugBridge) return { error: 'DebugBridge not initialized' };
      return debugBridge.setBreakpoint(args.sessionId, args.filePath, args.line);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DEBUG.CONTINUE, async (_event, args: { sessionId: string }) => {
    try {
      if (!debugBridge) return { error: 'DebugBridge not initialized' };
      debugBridge.continueExecution(args.sessionId);
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DEBUG.STEP_OVER, async (_event, args: { sessionId: string }) => {
    try {
      if (!debugBridge) return { error: 'DebugBridge not initialized' };
      debugBridge.stepOver(args.sessionId);
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DEBUG.STEP_INTO, async (_event, args: { sessionId: string }) => {
    try {
      if (!debugBridge) return { error: 'DebugBridge not initialized' };
      debugBridge.stepInto(args.sessionId);
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DEBUG.STEP_OUT, async (_event, args: { sessionId: string }) => {
    try {
      if (!debugBridge) return { error: 'DebugBridge not initialized' };
      debugBridge.stepOut(args.sessionId);
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DEBUG.GET_VARIABLES, async (_event, args: { sessionId: string; frameId?: number }) => {
    try {
      if (!debugBridge) return [];
      return debugBridge.getVariables(args.sessionId, args.frameId);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DEBUG.GET_CALL_STACK, async (_event, args: { sessionId: string }) => {
    try {
      if (!debugBridge) return [];
      return debugBridge.getCallStack(args.sessionId);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DEBUG.GET_BREAKPOINTS, async (_event, args: { sessionId: string }) => {
    try {
      if (!debugBridge) return [];
      return debugBridge.getBreakpoints(args.sessionId);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  if (!sandboxRunner) {
    sandboxRunner = new SandboxRunner();
    sandboxRunner.on('executed', (event: { sandboxId: string; command: string; result: any }) => {
      try {
        const activeTaskId = workflowController?.getCurrentTaskId();
        if (activeTaskId) {
          kernelServices.evidencePipeline.addSandboxResult(
            activeTaskId,
            'sandbox',
            event.command,
            event.result,
          );
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('evidence:updated', { taskId: activeTaskId, type: 'sandbox' });
          }
        }
      } catch {}
    });
  }

  ipcMain.handle(IPC_CHANNELS.SANDBOX.CREATE, async (_event, args: { projectPath: string; config?: any }) => {
    try {
      if (!sandboxRunner) sandboxRunner = new SandboxRunner();
      return await sandboxRunner.createSandbox(args.projectPath, args.config);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SANDBOX.EXECUTE, async (_event, args: { sandboxId: string; command: string; cwd?: string }) => {
    try {
      if (!sandboxRunner) return { error: 'SandboxRunner not initialized' };
      return await sandboxRunner.executeInSandbox(args.sandboxId, args.command, args.cwd);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SANDBOX.STOP, async (_event, args: { sandboxId: string }) => {
    try {
      if (!sandboxRunner) return { error: 'SandboxRunner not initialized' };
      await sandboxRunner.stopSandbox(args.sandboxId);
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SANDBOX.STATUS, async (_event, args: { sandboxId: string }) => {
    try {
      if (!sandboxRunner) return { error: 'SandboxRunner not initialized' };
      return sandboxRunner.getSandboxStatus(args.sandboxId);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPDATER.CHECK, async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { updateAvailable: !!result, version: result?.updateInfo?.version };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPDATER.INSTALL, async () => {
    try {
      autoUpdater.quitAndInstall();
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  });
}

app.whenReady().then(() => {
  initializeKernel();
  registerIpcHandlers();
  createWindow();

  if (mainWindow) {
    const impactMapRepo = new (require('../src/db/repositories/impact-map-repo').ImpactMapRepository)();

    settingsService = new SettingsService();
    const openaiProvider = new OpenAIProvider(settingsService);
    const anthropicProvider = new AnthropicProvider(settingsService);
    kernelServices.modelGateway.addProvider(openaiProvider);
    kernelServices.modelGateway.addProvider(anthropicProvider);

    worktreeManager = new WorktreeManager(kernelServices.gitManager);
    worktreeManager.setMainWindow(mainWindow);

    workflowController = new WorkflowController(
      kernelServices.capsuleCompiler,
      kernelServices.guardEngine,
      kernelServices.agentRuntime,
      kernelServices.leaseManager,
      kernelServices.evidencePipeline,
      kernelServices.taskCapsuleRepo,
      impactMapRepo,
    );
    workflowController.setMainWindow(mainWindow);
    workflowController.setWorktreeManager(worktreeManager);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
