import type { ReviewPacket, IntentType, RiskLevel } from '@/types/core'

const intentPrefix: Record<IntentType, string> = {
  business_fix: 'fix',
  compatibility: 'compat',
  test_coverage: 'test',
  documentation: 'docs',
  refactor: 'refactor',
}

function getPrimaryIntent(packet: ReviewPacket): IntentType {
  const counts: Record<IntentType, number> = {
    business_fix: 0,
    compatibility: 0,
    test_coverage: 0,
    documentation: 0,
    refactor: 0,
  }

  for (const diff of packet.intentDiff) {
    for (const hunk of diff.hunks) {
      counts[hunk.intent]++
    }
  }

  for (const f of packet.changedFiles) {
    counts[f.intent]++
  }

  const sorted = (Object.entries(counts) as [IntentType, number][]).sort((a, b) => b[1] - a[1])
  return sorted[0][0]
}

function getMaxRiskLevel(packet: ReviewPacket): RiskLevel {
  const order: RiskLevel[] = ['low', 'medium', 'high', 'critical']
  let max: RiskLevel = 'low'
  for (const r of packet.risks) {
    if (order.indexOf(r.level) > order.indexOf(max)) {
      max = r.level
    }
  }
  return max
}

function generateTitle(packet: ReviewPacket): string {
  const primaryIntent = getPrimaryIntent(packet)
  const prefix = intentPrefix[primaryIntent]
  const goal = packet.impactMap?.target?.module || packet.taskId
  return `${prefix}: ${goal}`
}

function generateBody(packet: ReviewPacket): string {
  const sections: string[] = []

  sections.push('## Summary')
  sections.push(packet.impactMap?.target?.module || `Task ${packet.taskId}`)
  sections.push('')

  if (packet.changedFiles.length > 0) {
    sections.push('## Changed Files')
    for (const f of packet.changedFiles) {
      sections.push(`- \`${f.path}\` [${f.intent}] +${f.additions}/-${f.deletions}`)
    }
    sections.push('')
  }

  if (packet.impactMap) {
    sections.push('## Impact Analysis')
    sections.push(`- Target: ${packet.impactMap.target.module}`)
    sections.push(`- Upstream dependencies: ${packet.impactMap.upstreamDependencies.length}`)
    sections.push(`- Downstream dependents: ${packet.impactMap.downstreamDependents.length}`)
    sections.push(`- Affected tests: ${packet.impactMap.affectedTests.length}`)
    sections.push('')
  }

  if (packet.impactMap?.contractsTouched?.length) {
    sections.push('## Contracts Touched')
    for (const c of packet.impactMap.contractsTouched) {
      sections.push(`- ${c.name} (${c.type}, ${c.compatibility})`)
    }
    sections.push('')
  }

  const maxRisk = getMaxRiskLevel(packet)
  sections.push('## Risk Assessment')
  sections.push(`- Level: **${maxRisk}**`)
  for (const r of packet.risks) {
    for (const reason of r.reasons) {
      sections.push(`  - ${reason}`)
    }
  }
  if (packet.hasBreakingChange) {
    sections.push('- ⚠️ **BREAKING CHANGE** detected')
  }
  sections.push('')

  if (packet.unverifiedItems.length > 0) {
    sections.push('## Unverified Items')
    for (const u of packet.unverifiedItems) {
      sections.push(`- [${u.risk}] ${u.description}`)
    }
    sections.push('')
  }

  if (packet.reviewerFocus.length > 0) {
    sections.push('## Reviewer Focus')
    for (const item of packet.reviewerFocus) {
      sections.push(`- ${item}`)
    }
    sections.push('')
  }

  return sections.join('\n')
}

function generateLabels(packet: ReviewPacket): string[] {
  const labels: string[] = []
  const primaryIntent = getPrimaryIntent(packet)
  labels.push(primaryIntent)

  const maxRisk = getMaxRiskLevel(packet)
  if (maxRisk === 'high' || maxRisk === 'critical') {
    labels.push('high-risk')
  }

  if (packet.changedFiles.length > 10) {
    labels.push('large-change')
  } else if (packet.changedFiles.length <= 3) {
    labels.push('small-change')
  }

  if (packet.hasBreakingChange) {
    labels.push('breaking-change')
  }

  if (packet.impactMap?.contractsTouched?.length) {
    labels.push('contract-change')
  }

  if (packet.isOutOfScope) {
    labels.push('out-of-scope')
  }

  return [...new Set(labels)]
}

function generateReviewers(packet: ReviewPacket): string[] {
  const reviewers: string[] = []
  const maxRisk = getMaxRiskLevel(packet)

  if (packet.impactMap?.contractsTouched?.some((c) => c.compatibility === 'must_preserve')) {
    reviewers.push('architect')
  }

  if (maxRisk === 'critical') {
    reviewers.push('tech-lead')
    reviewers.push('security-reviewer')
  }

  if (maxRisk === 'high') {
    reviewers.push('tech-lead')
  }

  if (packet.hasBreakingChange) {
    reviewers.push('architect')
  }

  return [...new Set(reviewers)]
}

export function generatePrDescription(packet: ReviewPacket): {
  title: string
  body: string
  labels: string[]
  reviewers: string[]
} {
  return {
    title: generateTitle(packet),
    body: generateBody(packet),
    labels: generateLabels(packet),
    reviewers: generateReviewers(packet),
  }
}
