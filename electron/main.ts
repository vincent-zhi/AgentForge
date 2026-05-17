import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { IPC_CHANNELS } from '../src/ipc/channels';
import { initializeKernel, kernelServices } from '../src/kernel/index';
import { createApplicationMenu } from './menu';
import { SettingsService } from '../src/kernel/settings/settings-service';

let mainWindow: BrowserWindow | null = null;
let settingsService: SettingsService | null = null;

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
}

app.whenReady().then(() => {
  initializeKernel();
  registerIpcHandlers();
  createWindow();

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
