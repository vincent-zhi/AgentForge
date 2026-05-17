import { Menu, shell, dialog, app } from 'electron';
import { SettingsService } from '../src/kernel/settings/settings-service';

export function createApplicationMenu(mainWindow: Electron.BrowserWindow): void {
  let settingsService: SettingsService | null = null;

  async function getRecentProjects(): Promise<Array<{ path: string; name: string; lastOpened: string }>> {
    try {
      if (!settingsService) settingsService = new SettingsService();
      const data = await settingsService.get('recentProjects');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Project',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('menu:openProject'),
        },
        {
          label: 'Switch Project',
          submenu: [],
        },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow.webContents.send('menu:settings'),
        },
        { type: 'separator' },
        {
          label: 'Exit',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          role: 'undo',
        },
        {
          label: 'Redo',
          accelerator: 'CmdOrCtrl+Shift+Z',
          role: 'redo',
        },
        { type: 'separator' },
        {
          label: 'Find',
          accelerator: 'CmdOrCtrl+F',
          click: () => mainWindow.webContents.send('menu:find'),
        },
        {
          label: 'Replace',
          accelerator: 'CmdOrCtrl+H',
          click: () => mainWindow.webContents.send('menu:replace'),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Brain Panel',
          accelerator: 'CmdOrCtrl+B',
          click: () => mainWindow.webContents.send('menu:toggleBrainPanel'),
        },
        {
          label: 'Toggle Evidence Console',
          accelerator: 'CmdOrCtrl+J',
          click: () => mainWindow.webContents.send('menu:toggleEvidenceConsole'),
        },
        { type: 'separator' },
        {
          label: 'Command Palette',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => mainWindow.webContents.send('menu:commandPalette'),
        },
        { type: 'separator' },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow.reload(),
        },
        {
          label: 'Toggle DevTools',
          click: () => mainWindow.webContents.toggleDevTools(),
        },
      ],
    },
    {
      label: 'Task',
      submenu: [
        {
          label: 'New Task',
          click: () => mainWindow.webContents.send('menu:newTask'),
        },
        {
          label: 'Run Tests',
          click: () => mainWindow.webContents.send('menu:runTests'),
        },
        {
          label: 'Export Review Packet',
          click: () => mainWindow.webContents.send('menu:exportReviewPacket'),
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: async () => {
            await shell.openExternal('https://agentforge.dev/docs');
          },
        },
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'About AgentForge',
              message: 'AgentForge',
              detail: `Version: ${app.getVersion()}\nAgentic Engineering Workspace`,
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  refreshRecentProjectsMenu(mainWindow);

  mainWindow.on('focus', () => {
    refreshRecentProjectsMenu(mainWindow);
  });
}

function refreshRecentProjectsMenu(mainWindow: Electron.BrowserWindow): void {
  const menu = Menu.getApplicationMenu();
  if (!menu) return;

  const fileMenu = menu.items.find((item) => item.label === 'File');
  if (!fileMenu) return;

  const switchProjectMenu = fileMenu.submenu?.items.find((item) => item.label === 'Switch Project');
  if (!switchProjectMenu || !switchProjectMenu.submenu) return;

  switchProjectMenu.submenu.clear();

  const settingsService = new SettingsService();
  settingsService.get('recentProjects').then((data) => {
    const recentProjects: Array<{ path: string; name: string; lastOpened: string }> = data ? JSON.parse(data) : [];
    const submenu = Menu.buildFromTemplate(
      recentProjects.map((project) => ({
        label: `${project.name} — ${project.path}`,
        click: () => mainWindow.webContents.send('menu:switchProject', project.path),
      }))
    );

    if (recentProjects.length === 0) {
      submenu.append(new (require('electron').MenuItem)({ label: 'No Recent Projects', enabled: false }));
    }

    switchProjectMenu.submenu = submenu;
    Menu.setApplicationMenu(menu);
  }).catch(() => {});
}
