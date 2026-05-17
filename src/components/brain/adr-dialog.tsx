import React, { useState, useEffect } from 'react';
import type { ADR, ADRStatus } from '@/kernel/project-brain/adr-manager';

interface ADRDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<ADR, 'id' | 'date'>) => void;
  editADR?: ADR | null;
}

const STATUS_OPTIONS: ADRStatus[] = ['proposed', 'accepted', 'deprecated', 'superseded'];

const ADRDialog: React.FC<ADRDialogProps> = React.memo(({ open, onClose, onSave, editADR }) => {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<ADRStatus>('proposed');
  const [context, setContext] = useState('');
  const [decision, setDecision] = useState('');
  const [consequences, setConsequences] = useState('');

  useEffect(() => {
    if (editADR) {
      setTitle(editADR.title);
      setStatus(editADR.status);
      setContext(editADR.context);
      setDecision(editADR.decision);
      setConsequences(editADR.consequences);
    } else {
      setTitle('');
      setStatus('proposed');
      setContext('');
      setDecision('');
      setConsequences('');
    }
  }, [editADR, open]);

  if (!open) return null;

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ title, status, context, decision, consequences });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-forge-black/70" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-graphite border border-forged-steel/30 rounded-lg shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header">
          <span>{editADR ? 'Edit Decision' : 'New Decision'}</span>
          <button onClick={onClose} className="text-forged-steel hover:text-bright-steel transition-colors">✕</button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs text-text-gray mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field text-sm"
              placeholder="ADR title..."
            />
          </div>

          <div>
            <label className="block text-xs text-text-gray mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ADRStatus)}
              className="input-field text-sm"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-text-gray mb-1">Context</label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="input-field text-sm min-h-[80px] resize-y"
              placeholder="What is the context for this decision..."
            />
          </div>

          <div>
            <label className="block text-xs text-text-gray mb-1">Decision</label>
            <textarea
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              className="input-field text-sm min-h-[80px] resize-y"
              placeholder="What was decided..."
            />
          </div>

          <div>
            <label className="block text-xs text-text-gray mb-1">Consequences</label>
            <textarea
              value={consequences}
              onChange={(e) => setConsequences(e.target.value)}
              className="input-field text-sm min-h-[80px] resize-y"
              placeholder="What are the consequences..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-forged-steel/20">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button onClick={handleSave} className="btn-primary text-sm" disabled={!title.trim()}>Save</button>
        </div>
      </div>
    </div>
  );
});

ADRDialog.displayName = 'ADRDialog';

export { ADRDialog };
