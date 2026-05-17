import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTaskStore } from '@/store/task-store';
import { useProjectStore } from '@/store/project-store';
import { bridge } from '@/ipc/bridge';
import { TaskHistory } from '@/components/task/task-history';
import { PlanConfirmDialog } from '@/components/task/plan-confirm-dialog';
import { Badge } from '@/components/ui/badge';
import type { TaskCapsule } from '@/types/core';
import type { TaskClassification } from '@/kernel/workflow/task-classifier';

export const GoalBar: React.FC = () => {
  const [goal, setGoal] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [classification, setClassification] = useState<TaskClassification | null>(null);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isCreating, isExecuting, currentTaskId, tasks, setCreating, addTask, setCurrentTask, setPlanCapsule } = useTaskStore();
  const { scanResult, recentProjects, openProject, switchProject } = useProjectStore();

  const currentTask = tasks.find((t) => t.id === currentTaskId);

  const planCapsule = useTaskStore((s) => s.planCapsule);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowProjectDropdown(false);
      }
    }
    if (showProjectDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProjectDropdown]);

  const handleOpenProject = useCallback(async () => {
    try {
      const selectedPath = await bridge.project.open() as string;
      if (selectedPath) {
        await openProject(selectedPath);
      }
    } catch {}
  }, [openProject]);

  const handleSwitchProject = useCallback(async (projectPath: string) => {
    setShowProjectDropdown(false);
    try {
      await switchProject(projectPath);
    } catch {}
  }, [switchProject]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!goal.trim() || isCreating) return;
      setCreating(true);
      try {
        const cls = await bridge.workflow.classify(goal.trim()) as TaskClassification;
        setClassification(cls);
        const result = await bridge.workflow.start(goal.trim()) as TaskCapsule;
        addTask(result);
        setCurrentTask(result.id);
        if (cls.complexity !== 'lightweight') {
          setPlanCapsule(result);
          setShowPlanDialog(true);
        }
        setGoal('');
      } catch {
        setPlanCapsule(null);
      } finally {
        setCreating(false);
      }
    },
    [goal, isCreating, setCreating, addTask, setCurrentTask, setPlanCapsule],
  );

  const handleConfirmPlan = useCallback(async () => {
    if (!planCapsule) return;
    setShowPlanDialog(false);
    try {
      await bridge.workflow.confirm(planCapsule.id);
    } catch {}
  }, [planCapsule]);

  const handleCancelPlan = useCallback(() => {
    setShowPlanDialog(false);
    setPlanCapsule(null);
  }, [setPlanCapsule]);

  return (
    <div className="flex">
      <div className="flex-1 flex items-center gap-4 px-4 py-2 bg-graphite border-b border-forged-steel/20">
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleOpenProject}
            className="text-ember-orange hover:text-ember-orange/80 transition-colors p-1"
            title="Open Project"
          >
            📂
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`transition-colors p-1 ${showHistory ? 'text-ember-orange' : 'text-forged-steel hover:text-bright-steel'}`}
            title="Task History"
          >
            📋
          </button>
          <span className="text-ember-orange font-bold text-sm tracking-tight">
            Agent<span className="text-bright-steel">Forge</span>
          </span>
          {scanResult && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                className="chip flex items-center gap-1 cursor-pointer hover:bg-ember-orange/20 transition-colors"
              >
                {scanResult.name}
                <span className="text-xs text-gray">▾</span>
              </button>
              {showProjectDropdown && recentProjects.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-forge-black border border-forged-steel/30 rounded shadow-lg z-50 py-1">
                  {recentProjects.map((project) => (
                    <button
                      key={project.path}
                      onClick={() => handleSwitchProject(project.path)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-ember-orange/10 transition-colors ${project.path === scanResult.name ? 'text-ember-orange' : 'text-bright-steel'}`}
                    >
                      <span className="font-semibold">{project.name}</span>
                      <span className="block text-xs font-mono text-gray truncate">{project.path}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="你想让这个项目发生什么变化？"
            className="input-field flex-1 text-sm py-1.5"
            disabled={isCreating || isExecuting}
          />
          <button
            type="submit"
            disabled={!goal.trim() || isCreating || isExecuting}
            className="btn-primary px-3 py-1.5 text-sm flex items-center gap-1"
          >
            <span>→</span>
          </button>
          {classification && (
            <Badge
              variant={
                classification.complexity === 'lightweight' ? 'verified' :
                classification.complexity === 'strict' ? 'blocked' : 'partial'
              }
              label={classification.complexity}
            />
          )}
        </form>

        <div className="flex items-center gap-2 flex-shrink-0">
          {currentTask && (
            <>
              <span className="badge-ember">{currentTask.status}</span>
              {isExecuting && (
                <span className="badge-analyzing">executing</span>
              )}
            </>
          )}
        </div>
      </div>
      {showHistory && (
        <div className="w-72 flex-shrink-0 border-b border-forged-steel/20">
          <TaskHistory onClose={() => setShowHistory(false)} />
        </div>
      )}
      <PlanConfirmDialog
        open={showPlanDialog}
        onClose={handleCancelPlan}
        onConfirm={handleConfirmPlan}
        capsule={planCapsule}
      />
    </div>
  );
};
