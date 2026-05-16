import React from 'react';
import { Badge } from '@/components/ui/badge';
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
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-forged-steel">Result:</span>
        <Badge variant={resultVariant[packet.result]} label={packet.result.toUpperCase()} />
      </div>

      {packet.changedFiles.length > 0 && (
        <div>
          <div className="text-xs text-forged-steel mb-1">Changed Files</div>
          <div className="space-y-1">
            {packet.changedFiles.map((f: ChangedFile, i: number) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-sm bg-forge-black/50">
                <span className="text-xs font-mono text-bright-steel flex-1 truncate">{f.path}</span>
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
    </div>
  );
});

ReviewPacketView.displayName = 'ReviewPacketView';

export { ReviewPacketView };
