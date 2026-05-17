import React, { useCallback } from 'react';
import { useDebugStore } from '@/store/debug-store';

const DebugPanel: React.FC = React.memo(() => {
  const session = useDebugStore((s) => s.session);
  const breakpoints = useDebugStore((s) => s.breakpoints);
  const variables = useDebugStore((s) => s.variables);
  const callStack = useDebugStore((s) => s.callStack);
  const isPaused = useDebugStore((s) => s.isPaused);
  const continueExecution = useDebugStore((s) => s.continueExecution);
  const stepOver = useDebugStore((s) => s.stepOver);
  const stepInto = useDebugStore((s) => s.stepInto);
  const stepOut = useDebugStore((s) => s.stepOut);
  const stopSession = useDebugStore((s) => s.stopSession);

  const handleContinue = useCallback(() => {
    continueExecution();
  }, [continueExecution]);

  const handleStepOver = useCallback(() => {
    stepOver();
  }, [stepOver]);

  const handleStepInto = useCallback(() => {
    stepInto();
  }, [stepInto]);

  const handleStepOut = useCallback(() => {
    stepOut();
  }, [stepOut]);

  const handleStop = useCallback(() => {
    stopSession();
  }, [stopSession]);

  const hasActiveSession = session !== null && session.status !== 'stopped';

  return (
    <div className="flex flex-col h-full text-xs font-mono">
      <div className="flex shrink-0 items-center gap-1 px-2 py-1 border-b border-forged-steel/20 bg-forge-black/50">
        <button
          onClick={handleContinue}
          disabled={!hasActiveSession || !isPaused}
          className={`px-2 py-0.5 rounded-sm text-[10px] transition-colors ${
            hasActiveSession && isPaused
              ? 'bg-ember-orange/20 text-ember-orange hover:bg-ember-orange/30'
              : 'bg-forged-steel/10 text-forged-steel/50 cursor-not-allowed'
          }`}
          title="Continue (F5)"
        >
          ▶ Continue
        </button>
        <button
          onClick={handleStepOver}
          disabled={!hasActiveSession || !isPaused}
          className={`px-2 py-0.5 rounded-sm text-[10px] transition-colors ${
            hasActiveSession && isPaused
              ? 'bg-graphite/50 text-bright-steel hover:bg-graphite/70'
              : 'bg-forged-steel/10 text-forged-steel/50 cursor-not-allowed'
          }`}
          title="Step Over (F10)"
        >
          ⏭ Over
        </button>
        <button
          onClick={handleStepInto}
          disabled={!hasActiveSession || !isPaused}
          className={`px-2 py-0.5 rounded-sm text-[10px] transition-colors ${
            hasActiveSession && isPaused
              ? 'bg-graphite/50 text-bright-steel hover:bg-graphite/70'
              : 'bg-forged-steel/10 text-forged-steel/50 cursor-not-allowed'
          }`}
          title="Step Into (F11)"
        >
          ⬇ Into
        </button>
        <button
          onClick={handleStepOut}
          disabled={!hasActiveSession || !isPaused}
          className={`px-2 py-0.5 rounded-sm text-[10px] transition-colors ${
            hasActiveSession && isPaused
              ? 'bg-graphite/50 text-bright-steel hover:bg-graphite/70'
              : 'bg-forged-steel/10 text-forged-steel/50 cursor-not-allowed'
          }`}
          title="Step Out (Shift+F11)"
        >
          ⬆ Out
        </button>
        <button
          onClick={handleStop}
          disabled={!hasActiveSession}
          className={`px-2 py-0.5 rounded-sm text-[10px] transition-colors ${
            hasActiveSession
              ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
              : 'bg-forged-steel/10 text-forged-steel/50 cursor-not-allowed'
          }`}
          title="Stop"
        >
          ⏹ Stop
        </button>
        {hasActiveSession && (
          <span className={`ml-auto text-[10px] ${isPaused ? 'text-ember-orange' : 'text-green-400'}`}>
            {isPaused ? '● Paused' : '● Running'}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <div className="border-b border-forged-steel/20">
          <div className="px-2 py-1 text-[10px] text-forged-steel uppercase tracking-wider bg-forge-black/30">
            Variables
          </div>
          <div className="px-2 py-1">
            {variables.length === 0 ? (
              <div className="text-[10px] text-forged-steel/50 py-1">No variables</div>
            ) : (
              variables.map((v, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                  <span className="text-ember-orange shrink-0">{v.name}</span>
                  <span className="text-forged-steel/50 shrink-0">{v.type}</span>
                  <span className="text-bright-steel truncate">{v.value}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border-b border-forged-steel/20">
          <div className="px-2 py-1 text-[10px] text-forged-steel uppercase tracking-wider bg-forge-black/30">
            Call Stack
          </div>
          <div className="px-2 py-1">
            {callStack.length === 0 ? (
              <div className="text-[10px] text-forged-steel/50 py-1">No call stack</div>
            ) : (
              callStack.map((frame) => (
                <div key={frame.id} className="flex items-center gap-2 py-0.5">
                  <span className="text-ember-orange shrink-0">{frame.name}</span>
                  <span className="text-bright-steel truncate">{frame.filePath}:{frame.line}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="px-2 py-1 text-[10px] text-forged-steel uppercase tracking-wider bg-forge-black/30">
            Breakpoints
          </div>
          <div className="px-2 py-1">
            {breakpoints.length === 0 ? (
              <div className="text-[10px] text-forged-steel/50 py-1">No breakpoints</div>
            ) : (
              breakpoints.map((bp) => (
                <div key={bp.id} className="flex items-center gap-2 py-0.5">
                  <span className={`shrink-0 ${bp.verified ? 'text-ember-orange' : 'text-forged-steel/50'}`}>
                    {bp.verified ? '●' : '○'}
                  </span>
                  <span className="text-bright-steel truncate">{bp.filePath}:{bp.line}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

DebugPanel.displayName = 'DebugPanel';

export { DebugPanel };
