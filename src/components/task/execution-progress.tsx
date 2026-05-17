import React, { useMemo } from 'react';

export interface StepInfo {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration?: number;
}

interface ExecutionProgressProps {
  currentStep: string;
  steps: StepInfo[];
}

const DEFAULT_STEPS: StepInfo[] = [
  { id: 'architect', label: 'Architect', status: 'pending' },
  { id: 'impact', label: 'Impact', status: 'pending' },
  { id: 'contract', label: 'Contract', status: 'pending' },
  { id: 'search', label: 'Search', status: 'pending' },
  { id: 'coder', label: 'Coder', status: 'pending' },
  { id: 'tester', label: 'Tester', status: 'pending' },
  { id: 'reviewer', label: 'Reviewer', status: 'pending' },
  { id: 'doc', label: 'Doc', status: 'pending' },
];

const ExecutionProgress: React.FC<ExecutionProgressProps> = React.memo(({
  currentStep,
  steps,
}) => {
  const resolvedSteps = useMemo(() => {
    if (steps.length > 0) return steps;
    return DEFAULT_STEPS.map((s) => ({
      ...s,
      status: s.id === currentStep ? 'running' as const : 'pending' as const,
    }));
  }, [steps, currentStep]);

  const completedCount = resolvedSteps.filter((s) => s.status === 'completed').length;
  const totalCount = resolvedSteps.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="bg-graphite/50 rounded-md p-3 border border-forged-steel/20">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-bright-steel font-semibold">Execution Progress</span>
        <span className="text-[10px] text-forged-steel">{completedCount}/{totalCount}</span>
      </div>

      <div className="w-full h-1.5 bg-forge-black rounded-full mb-3 overflow-hidden">
        <div
          className="h-full bg-ember-orange rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="space-y-1.5">
        {resolvedSteps.map((step) => (
          <div key={step.id} className="flex items-center gap-2.5">
            <div className="relative flex-shrink-0">
              {step.status === 'completed' && (
                <div className="w-5 h-5 rounded-full bg-safe-green/20 flex items-center justify-center">
                  <span className="text-safe-green text-[10px]">✓</span>
                </div>
              )}
              {step.status === 'running' && (
                <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse border border-blue-500/50">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                </div>
              )}
              {step.status === 'failed' && (
                <div className="w-5 h-5 rounded-full bg-risk-red/20 flex items-center justify-center">
                  <span className="text-risk-red text-[10px]">✗</span>
                </div>
              )}
              {step.status === 'pending' && (
                <div className="w-5 h-5 rounded-full bg-forged-steel/20 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-forged-steel/50" />
                </div>
              )}
            </div>

            <span className={`text-xs flex-1 ${
              step.status === 'completed' ? 'text-bright-steel' :
              step.status === 'running' ? 'text-bright-steel' :
              step.status === 'failed' ? 'text-risk-red' :
              'text-forged-steel'
            }`}>
              {step.label}
              {step.status === 'running' && (
                <span className="text-blue-400 ml-1">执行中...</span>
              )}
            </span>

            {step.status === 'completed' && step.duration !== undefined && (
              <span className="text-[10px] text-forged-steel">{step.duration.toFixed(1)}s</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

ExecutionProgress.displayName = 'ExecutionProgress';

export { ExecutionProgress };
