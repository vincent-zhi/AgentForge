import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { TaskCapsule } from '@/types/core';

interface SpecViewProps {
  task: TaskCapsule;
}

const SpecView: React.FC<SpecViewProps> = React.memo(({ task }) => {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-forged-steel mb-1">Goal</div>
        <div className="text-sm text-bright-steel font-medium">{task.goal}</div>
      </div>

      {task.nonGoals.length > 0 && (
        <div>
          <div className="text-xs text-forged-steel mb-1">Non-Goals</div>
          <ul className="space-y-1">
            {task.nonGoals.map((ng, i) => (
              <li key={i} className="text-sm text-text-gray flex items-start gap-1.5">
                <span className="shrink-0">❌</span>
                <span>{ng}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <div className="text-xs text-forged-steel mb-2">Scope</div>
        <div className="space-y-2">
          {task.writable.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Badge variant="verified" label="Writable" />
              </div>
              <div className="space-y-0.5 pl-2">
                {task.writable.map((p, i) => (
                  <div key={i} className="text-xs text-safe-green font-mono">{p}</div>
                ))}
              </div>
            </div>
          )}
          {task.readonly.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Badge variant="analyzing" label="Readonly" />
              </div>
              <div className="space-y-0.5 pl-2">
                {task.readonly.map((p, i) => (
                  <div key={i} className="text-xs text-blue-400 font-mono">{p}</div>
                ))}
              </div>
            </div>
          )}
          {task.forbidden.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Badge variant="blocked" label="Forbidden" />
              </div>
              <div className="space-y-0.5 pl-2">
                {task.forbidden.map((p, i) => (
                  <div key={i} className="text-xs text-risk-red font-mono">{p}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {task.mustPreserve.length > 0 && (
        <div>
          <div className="text-xs text-forged-steel mb-1">Must-Preserve Contracts</div>
          <div className="space-y-1">
            {task.mustPreserve.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 px-2 py-1 rounded-sm bg-forge-black/50"
              >
                <span className="text-xs">🔒</span>
                <span className="text-sm text-bright-steel flex-1 truncate">{c.name}</span>
                <Badge variant="blocked" label={c.compatibility} />
              </div>
            ))}
          </div>
        </div>
      )}

      {task.requiredTests.length > 0 && (
        <div>
          <div className="text-xs text-forged-steel mb-1">Required Tests</div>
          <div className="space-y-1">
            {task.requiredTests.map((t, i) => (
              <div
                key={i}
                className="px-2 py-1 rounded-sm bg-forge-black/50"
              >
                <div className="text-xs text-bright-steel font-mono">{t.command}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="verified" label="test" />
                  <span className="text-[10px] text-forged-steel">{t.module}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

SpecView.displayName = 'SpecView';

export { SpecView };
