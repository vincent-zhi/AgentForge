import React, { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { bridge } from '@/ipc/bridge';
import { exportToMarkdown } from '@/kernel/review-packet/markdown-exporter';
import { PrCreateDialog } from '@/components/task/pr-create-dialog';
import type { ReviewPacket, VerificationResult, UnverifiedItem, MemoryUpdateProposal, RiskAssessment, ChangedFile } from '@/types/core';

interface ReviewPacketViewProps {
  packet: ReviewPacket;
}

const resultVariant: Record<string, 'verified' | 'partial' | 'blocked'> = {
  success: 'verified',
  partial: 'partial',
  failed: 'blocked',
};

const intentLabels: Record<string, string> = {
  business_fix: '业务修复',
  compatibility: '兼容性保护',
  test_coverage: '测试覆盖',
  documentation: '文档更新',
  refactor: '附带重构',
};

const intentVariant: Record<string, 'ember' | 'analyzing' | 'verified' | 'unverified' | 'brain'> = {
  business_fix: 'ember',
  compatibility: 'analyzing',
  test_coverage: 'verified',
  documentation: 'unverified',
  refactor: 'brain',
};

const riskVariant: Record<string, 'verified' | 'partial' | 'blocked'> = {
  low: 'verified',
  medium: 'partial',
  high: 'blocked',
  critical: 'blocked',
};

const actionVariant: Record<string, 'verified' | 'partial' | 'unverified' | 'blocked'> = {
  create: 'verified',
  update: 'partial',
  stale: 'unverified',
  reject: 'blocked',
};

const ReviewPacketView: React.FC<ReviewPacketViewProps> = React.memo(({ packet }) => {
  const [toast, setToast] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState<string | null>(null);
  const [showCommitArea, setShowCommitArea] = useState(false);
  const [prDialogInfo, setPrDialogInfo] = useState<{ title: string; body: string; labels: string[]; reviewers: string[] } | null>(null);
  const [isGeneratingCommit, setIsGeneratingCommit] = useState(false);
  const [isGeneratingPr, setIsGeneratingPr] = useState(false);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const handleCopyMarkdown = useCallback(async () => {
    const md = exportToMarkdown(packet);
    try {
      await navigator.clipboard.writeText(md);
      showToast('已复制到剪贴板');
    } catch {
      showToast('复制失败');
    }
  }, [packet, showToast]);

  const handleSaveToFile = useCallback(async () => {
    const md = exportToMarkdown(packet);
    const filePath = `review-packet-${packet.taskId}.md`;
    try {
      await bridge.file.write(filePath, md);
      showToast(`已保存到 ${filePath}`);
    } catch {
      showToast('保存失败');
    }
  }, [packet, showToast]);

  const handleGenerateCommit = useCallback(async () => {
    setIsGeneratingCommit(true);
    try {
      const result = await bridge.delivery.generateCommit(packet.taskId) as unknown as string;
      setCommitMessage(result);
      setShowCommitArea(true);
    } catch {
      showToast('生成提交消息失败');
    } finally {
      setIsGeneratingCommit(false);
    }
  }, [packet.taskId, showToast]);

  const handleCopyCommit = useCallback(async () => {
    if (!commitMessage) return;
    try {
      await navigator.clipboard.writeText(commitMessage);
      showToast('已复制提交消息');
    } catch {
      showToast('复制失败');
    }
  }, [commitMessage, showToast]);

  const handleCreatePr = useCallback(async () => {
    setIsGeneratingPr(true);
    try {
      const result = await bridge.delivery.generatePr(packet.taskId) as unknown as { title: string; body: string; labels: string[]; reviewers: string[] };
      setPrDialogInfo(result);
    } catch {
      showToast('生成PR信息失败');
    } finally {
      setIsGeneratingPr(false);
    }
  }, [packet.taskId, showToast]);

  const handlePrCreate = useCallback(async (_prInfo: { title: string; body: string; labels: string[]; reviewers: string[] }) => {
    showToast('PR创建功能需要项目路径和分支名');
    setPrDialogInfo(null);
  }, [showToast]);

  const handlePrCancel = useCallback(() => {
    setPrDialogInfo(null);
  }, []);

  return (
    <div className="space-y-4 relative">
      {toast && (
        <div className="absolute top-0 right-0 z-50 px-3 py-1.5 rounded-md bg-ember-orange/20 text-ember-orange text-xs border border-ember-orange/30">
          {toast}
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={handleCopyMarkdown}
          className="px-2.5 py-1 text-xs rounded-sm bg-ember-orange/10 text-ember-orange border border-ember-orange/20 hover:bg-ember-orange/20 transition-colors"
        >
          Copy Markdown
        </button>
        <button
          onClick={handleSaveToFile}
          className="px-2.5 py-1 text-xs rounded-sm bg-forge-black/50 text-bright-steel border border-forged-steel/20 hover:bg-forged-steel/20 transition-colors"
        >
          Save to File
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-forged-steel">Result:</span>
        <Badge variant={resultVariant[packet.result]} label={packet.result.toUpperCase()} />
      </div>

      {packet.changedFiles.length > 0 && (
        <div>
          <div className="text-xs text-forged-steel mb-1">Changed Files</div>
          <div className="space-y-1">
            {packet.changedFiles.map((f: ChangedFile, i: number) => (
              <div key={i} className={`flex items-center gap-2 px-2 py-1 rounded-sm ${f.outOfScope ? 'bg-risk-red/10 border border-risk-red/30' : 'bg-forge-black/50'}`}>
                <span className="text-xs font-mono text-bright-steel flex-1 truncate">{f.path}</span>
                {f.outOfScope && (
                  <Badge variant="blocked" label="OUT OF SCOPE" />
                )}
                <Badge variant={intentVariant[f.intent] ?? 'default'} label={intentLabels[f.intent] ?? f.intent} />
                <span className="text-[10px] text-safe-green">+{f.additions}</span>
                <span className="text-[10px] text-risk-red">-{f.deletions}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {packet.impactMap && (
        <div>
          <div className="text-xs text-forged-steel mb-1">Impact Summary</div>
          <div className="bg-forge-black/50 rounded-md p-2 text-xs text-text-gray">
            Target: {packet.impactMap.target.module} ({packet.impactMap.target.files.length} files)
          </div>
        </div>
      )}

      {packet.verification.length > 0 && (
        <div>
          <div className="text-xs text-forged-steel mb-1">Verification</div>
          <div className="space-y-1">
            {packet.verification.map((v: VerificationResult, i: number) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-sm bg-forge-black/50">
                <Badge variant={v.passed ? 'verified' : 'blocked'} label={v.passed ? 'PASS' : 'FAIL'} />
                <span className="text-xs text-bright-steel flex-1">{v.name}</span>
                <span className="text-[10px] text-forged-steel">{v.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {packet.risks.length > 0 && (
        <div>
          <div className="text-xs text-forged-steel mb-1">Risks</div>
          <div className="space-y-1">
            {packet.risks.map((r: RiskAssessment, i: number) => (
              <div key={i} className="px-2 py-1.5 rounded-sm bg-forge-black/50">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={riskVariant[r.level]} label={r.level} />
                </div>
                <ul className="space-y-0.5 pl-2">
                  {r.reasons.map((reason: string, j: number) => (
                    <li key={j} className="text-xs text-text-gray">• {reason}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {packet.reviewerFocus.length > 0 && (
        <div>
          <div className="text-xs text-forged-steel mb-1">Reviewer Focus</div>
          <div className="space-y-1">
            {packet.reviewerFocus.map((item: string, i: number) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-sm bg-ember-orange/5 border border-ember-orange/20">
                <span className="text-xs">🔍</span>
                <span className="text-xs text-bright-steel">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {packet.unverifiedItems.length > 0 && (
        <div>
          <div className="text-xs text-forged-steel mb-1">Unverified Items</div>
          <div className="space-y-1">
            {packet.unverifiedItems.map((u: UnverifiedItem, i: number) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-sm bg-forge-black/50">
                <span className="text-xs">⚠️</span>
                <span className="text-xs text-bright-steel flex-1">{u.description}</span>
                <Badge variant={riskVariant[u.risk]} label={u.risk} />
              </div>
            ))}
          </div>
        </div>
      )}

      {packet.suggestedPr && (
        <div>
          <div className="text-xs text-forged-steel mb-1">Suggested PR</div>
          <div className="bg-forge-black/50 rounded-md p-2 space-y-1">
            <div className="text-sm text-bright-steel font-medium">{packet.suggestedPr.title}</div>
            <div className="text-xs text-text-gray">{packet.suggestedPr.body}</div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {packet.suggestedPr.labels.map((l: string) => (
                <Badge key={l} variant="ember" label={l} />
              ))}
              {packet.suggestedPr.reviewers.map((r: string) => (
                <Badge key={r} variant="default" label={r} />
              ))}
            </div>
          </div>
        </div>
      )}

      {packet.memoryUpdates.length > 0 && (
        <div>
          <div className="text-xs text-forged-steel mb-1">Memory Updates</div>
          <div className="space-y-1">
            {packet.memoryUpdates.map((m: MemoryUpdateProposal, i: number) => (
              <div key={i} className="px-2 py-1.5 rounded-sm bg-forge-black/50">
                <div className="flex items-center gap-2 mb-0.5">
                  <Badge variant={actionVariant[m.action]} label={m.action} />
                  <span className="text-xs text-bright-steel truncate">{m.fact.statement ?? 'New fact'}</span>
                </div>
                <div className="text-[10px] text-forged-steel pl-2">{m.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {packet.plannedVsActual && (
        <div>
          <div className="text-xs text-forged-steel mb-1">Planned vs Actual Impact</div>
          <div className={`px-2 py-1.5 rounded-sm ${packet.plannedVsActual.match ? 'bg-safe-green/10 border border-safe-green/20' : 'bg-ember-orange/10 border border-ember-orange/20'}`}>
            <div className="flex items-center gap-2">
              <Badge variant={packet.plannedVsActual.match ? 'verified' : 'blocked'} label={packet.plannedVsActual.match ? 'MATCH' : 'MISMATCH'} />
              <span className="text-xs text-bright-steel">
                {packet.plannedVsActual.newContractsTouched > 0 && `${packet.plannedVsActual.newContractsTouched} new contract(s) `}
                {packet.plannedVsActual.newAffectedTests > 0 && `${packet.plannedVsActual.newAffectedTests} new test(s) `}
                {packet.plannedVsActual.outOfScopeFiles.length > 0 && `${packet.plannedVsActual.outOfScopeFiles.length} out-of-scope file(s)`}
                {packet.plannedVsActual.match && 'No differences detected'}
              </span>
            </div>
            {packet.plannedVsActual.outOfScopeFiles.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {packet.plannedVsActual.outOfScopeFiles.map((file: string, i: number) => (
                  <div key={i} className="text-[10px] text-risk-red font-mono pl-2">{file}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {packet.isOutOfScope && (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-sm bg-warning-amber/10 border border-warning-amber/20">
          <span>⚠️</span>
          <span className="text-xs text-warning-amber">Out-of-scope changes detected</span>
        </div>
      )}

      {packet.hasBreakingChange && (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-sm bg-risk-red/10 border border-risk-red/20">
          <span>🚫</span>
          <span className="text-xs text-risk-red">Breaking changes detected</span>
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-forged-steel/20">
        <button
          onClick={handleGenerateCommit}
          disabled={isGeneratingCommit}
          className="px-2.5 py-1 text-xs rounded-sm bg-ember-orange/10 text-ember-orange border border-ember-orange/20 hover:bg-ember-orange/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGeneratingCommit ? 'Generating...' : 'Generate Commit'}
        </button>
        <button
          onClick={handleCreatePr}
          disabled={isGeneratingPr}
          className="px-2.5 py-1 text-xs rounded-sm bg-forge-black/50 text-bright-steel border border-forged-steel/20 hover:bg-forged-steel/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGeneratingPr ? 'Generating...' : 'Create PR'}
        </button>
      </div>

      {showCommitArea && commitMessage && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-forged-steel">Commit Message</span>
            <button
              onClick={handleCopyCommit}
              className="px-2 py-0.5 text-[10px] rounded-sm bg-ember-orange/10 text-ember-orange border border-ember-orange/20 hover:bg-ember-orange/20 transition-colors"
            >
              Copy
            </button>
          </div>
          <textarea
            readOnly
            value={commitMessage}
            rows={6}
            className="input-field text-xs font-mono resize-y"
          />
        </div>
      )}

      {prDialogInfo && (
        <PrCreateDialog
          title={prDialogInfo.title}
          body={prDialogInfo.body}
          labels={prDialogInfo.labels}
          reviewers={prDialogInfo.reviewers}
          onCreate={handlePrCreate}
          onCancel={handlePrCancel}
        />
      )}
    </div>
  );
});

ReviewPacketView.displayName = 'ReviewPacketView';

export { ReviewPacketView };
