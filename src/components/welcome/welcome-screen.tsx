import React, { useCallback, useEffect } from 'react';
import { useProjectStore } from '@/store/project-store';
import { bridge } from '@/ipc/bridge';

function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 30) return `${diffDays}天前`;
  return new Date(isoString).toLocaleDateString();
}

export const WelcomeScreen: React.FC = () => {
  const { recentProjects, openProject, removeRecentProject, loadRecentProjects } = useProjectStore();

  useEffect(() => {
    loadRecentProjects();
  }, [loadRecentProjects]);

  const handleOpenProject = useCallback(async () => {
    try {
      const selectedPath = await bridge.project.open() as string;
      if (selectedPath) {
        await openProject(selectedPath);
      }
    } catch {}
  }, [openProject]);

  const handleOpenRecent = useCallback(async (path: string) => {
    try {
      await openProject(path);
    } catch {}
  }, [openProject]);

  const handleRemoveRecent = useCallback((e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    removeRecentProject(path);
  }, [removeRecentProject]);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-forge-black text-bright-steel">
      <div className="flex flex-col items-center gap-8 max-w-lg w-full px-6">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-5xl font-bold tracking-tight">
            Agent<span className="text-ember-orange">Forge</span>
          </h1>
          <p className="text-gray text-lg">智能体工程工作台</p>
        </div>

        <button
          onClick={handleOpenProject}
          className="btn-primary px-8 py-3 text-lg font-semibold rounded-lg bg-ember-orange hover:bg-ember-orange/90 transition-colors"
        >
          Open Project
        </button>

        {recentProjects.length > 0 && (
          <div className="w-full flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-gray uppercase tracking-wider">最近项目</h2>
            <ul className="flex flex-col gap-1">
              {recentProjects.map((project) => (
                <li key={project.path}>
                  <button
                    onClick={() => handleOpenRecent(project.path)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-forged-steel/10 transition-colors flex items-center justify-between group"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className="text-sm font-bold text-bright-steel group-hover:text-ember-orange transition-colors truncate">
                        {project.name}
                      </span>
                      <span className="text-xs font-mono text-gray truncate">
                        {project.path}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="text-xs text-gray">
                        {formatRelativeTime(project.lastOpened)}
                      </span>
                      <span
                        onClick={(e) => handleRemoveRecent(e, project.path)}
                        className="text-gray hover:text-ember-orange transition-colors cursor-pointer text-sm px-1"
                      >
                        ✕
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="w-full flex flex-col gap-4 mt-4">
          <h2 className="text-sm font-semibold text-gray uppercase tracking-wider">Quick Start</h2>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-ember-orange/20 text-ember-orange text-sm font-bold flex items-center justify-center">
                1
              </span>
              <div>
                <p className="text-sm font-semibold text-bright-steel">打开项目</p>
                <p className="text-xs text-gray">选择你的代码仓库</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-ember-orange/20 text-ember-orange text-sm font-bold flex items-center justify-center">
                2
              </span>
              <div>
                <p className="text-sm font-semibold text-bright-steel">输入目标</p>
                <p className="text-xs text-gray">告诉 AgentForge 你想做什么</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-ember-orange/20 text-ember-orange text-sm font-bold flex items-center justify-center">
                3
              </span>
              <div>
                <p className="text-sm font-semibold text-bright-steel">审查交付</p>
                <p className="text-xs text-gray">审查证据包，安全应用变更</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
