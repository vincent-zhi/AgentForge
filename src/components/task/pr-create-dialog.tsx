import React, { useState, useCallback } from 'react'
import { Chip } from '@/components/ui/chip'

interface PrCreateDialogProps {
  title: string
  body: string
  labels: string[]
  reviewers: string[]
  onCreate: (prInfo: { title: string; body: string; labels: string[]; reviewers: string[] }) => void
  onCancel: () => void
}

const PrCreateDialog: React.FC<PrCreateDialogProps> = React.memo(({
  title: initialTitle,
  body: initialBody,
  labels: initialLabels,
  reviewers: initialReviewers,
  onCreate,
  onCancel,
}) => {
  const [title, setTitle] = useState(initialTitle)
  const [body, setBody] = useState(initialBody)
  const [labels, setLabels] = useState(initialLabels)
  const [reviewers, setReviewers] = useState(initialReviewers)

  const handleRemoveLabel = useCallback((label: string) => {
    setLabels((prev) => prev.filter((l) => l !== label))
  }, [])

  const handleRemoveReviewer = useCallback((reviewer: string) => {
    setReviewers((prev) => prev.filter((r) => r !== reviewer))
  }, [])

  const handleCreate = useCallback(() => {
    onCreate({ title, body, labels, reviewers })
  }, [title, body, labels, reviewers, onCreate])

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-forge-black/80">
      <div className="w-full max-w-2xl max-h-[85vh] bg-graphite border border-forged-steel/30 rounded-lg shadow-xl flex flex-col">
        <div className="panel-header shrink-0">
          <span>Create Pull Request</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="text-xs text-forged-steel mb-1 block">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-forged-steel mb-1 block">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="input-field text-xs font-mono resize-y"
            />
          </div>

          <div>
            <label className="text-xs text-forged-steel mb-1.5 block">Labels</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {labels.map((label) => (
                <Chip
                  key={label}
                  label={label}
                  variant="ember"
                  size="sm"
                  onRemove={() => handleRemoveLabel(label)}
                />
              ))}
              {labels.length === 0 && (
                <span className="text-xs text-forged-steel">No labels</span>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs text-forged-steel mb-1.5 block">Suggested Reviewers</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {reviewers.map((reviewer) => (
                <Chip
                  key={reviewer}
                  label={reviewer}
                  variant="default"
                  size="sm"
                  onRemove={() => handleRemoveReviewer(reviewer)}
                />
              ))}
              {reviewers.length === 0 && (
                <span className="text-xs text-forged-steel">No reviewers suggested</span>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-end gap-2 px-4 py-3 border-t border-forged-steel/20">
          <button
            onClick={onCancel}
            className="btn-secondary text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="btn-primary text-sm"
            disabled={!title.trim()}
          >
            Create PR
          </button>
        </div>
      </div>
    </div>
  )
})

PrCreateDialog.displayName = 'PrCreateDialog'

export { PrCreateDialog }
