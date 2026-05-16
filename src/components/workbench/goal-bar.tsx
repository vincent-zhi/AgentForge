import React, { useState, useCallback } from 'react';
import { useTaskStore } from '@/store/task-store';
import { useProjectStore } from '@/store/project-store';

export const GoalBar: React.FC = () => {
  const [goal, setGoal] = useState('');
  const { isCreating, isExecuting, currentTaskId, tasks, setCreating, addTask } = useTaskStore();
  const { scanResult } = useProjectStore();

  const currentTask = tasks.find((t) => t.id === currentTaskId);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!goal.trim() || isCreating) return;
      setCreating(true);
      const task = {
        id: crypto.randomUUID(),
        goal: goal.trim(),
        nonGoals: [],
        writable: [],
        readonly: [],
        forbidden: [],
        mustPreserve: [],
        affectedModules: [],
        requiredTests: [],
        reviewPolicy: {
          requireImpactGuard: true,
          requireAllTests: false,
          maxRiskLevel: 'medium' as const,
          requireHumanApproval: false,
        },
        status: 'draft' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addTask(task);
      useTaskStore.getState().setCurrentTask(task.id);
      setGoal('');
      setCreating(false);
    },
    [goal, isCreating, setCreating, addTask],
  );

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-graphite border-b border-forged-steel/20">
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-ember-orange font-bold text-sm tracking-tight">
          Agent<span className="text-bright-steel">Forge</span>
        </span>
        {scanResult && (
          <span className="chip">{scanResult.name}</span>
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
  );
};
