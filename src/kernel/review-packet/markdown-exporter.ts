import type { ReviewPacket, IntentType } from '@/types/core';

const intentLabels: Record<IntentType, string> = {
  business_fix: '业务修复',
  compatibility: '兼容性保护',
  test_coverage: '测试覆盖',
  documentation: '文档更新',
  refactor: '附带重构',
};

const resultLabels: Record<string, string> = {
  success: '✅ 成功',
  partial: '⚠️ 部分完成',
  failed: '❌ 失败',
};

export function exportToMarkdown(packet: ReviewPacket): string {
  const sections: string[] = [];

  sections.push('# Review Packet');
  sections.push('');

  sections.push('## 任务目标');
  sections.push(packet.impactMap?.target?.module || packet.taskId);
  sections.push('');

  sections.push('## 执行结果');
  sections.push(resultLabels[packet.result] || packet.result);
  sections.push('');

  if (packet.changedFiles.length > 0) {
    sections.push('## 改动文件');
    sections.push('| 文件 | 意图 | 添加 | 删除 |');
    sections.push('|------|------|------|------|');
    for (const f of packet.changedFiles) {
      const intentLabel = intentLabels[f.intent as IntentType] || f.intent;
      sections.push(`| ${f.path} | ${intentLabel} | +${f.additions} | -${f.deletions} |`);
    }
    sections.push('');
  }

  if (packet.impactMap) {
    sections.push('## 影响分析');
    const upstream = packet.impactMap.upstreamDependencies.map((d) => d.name).join(', ') || '无';
    const downstream = packet.impactMap.downstreamDependents.map((d) => d.name).join(', ') || '无';
    const contracts = packet.impactMap.contractsTouched.map((c) => c.name).join(', ') || '无';
    sections.push(`- 上游依赖: ${upstream}`);
    sections.push(`- 下游依赖方: ${downstream}`);
    sections.push(`- 触及契约: ${contracts}`);
    sections.push('');
  }

  if (packet.verification.length > 0) {
    sections.push('## 测试结果');
    for (const v of packet.verification) {
      const icon = v.passed ? '✅' : '❌';
      sections.push(`- ${icon} ${v.name} (${v.type})`);
    }
    sections.push('');
  }

  if (packet.risks.length > 0) {
    sections.push('## 风险评估');
    for (const r of packet.risks) {
      sections.push(`- 等级: ${r.level}`);
      if (r.reasons.length > 0) {
        sections.push(`- 原因: ${r.reasons.join('; ')}`);
      }
    }
    sections.push('');
  }

  if (packet.reviewerFocus.length > 0) {
    sections.push('## 审查重点');
    for (const item of packet.reviewerFocus) {
      sections.push(`- ${item}`);
    }
    sections.push('');
  }

  if (packet.unverifiedItems.length > 0) {
    sections.push('## 未验证项');
    for (const u of packet.unverifiedItems) {
      sections.push(`- ⚠️ ${u.description} (风险: ${u.risk})`);
    }
    sections.push('');
  }

  if (packet.suggestedPr) {
    sections.push('## PR 建议');
    sections.push(`**标题**: ${packet.suggestedPr.title}`);
    sections.push(`**标签**: ${packet.suggestedPr.labels.join(', ')}`);
    sections.push('');
    sections.push(packet.suggestedPr.body);
    sections.push('');
  }

  return sections.join('\n');
}
