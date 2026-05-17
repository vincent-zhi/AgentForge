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

  if (packet.changedFiles.length > 0) {
    for (const f of packet.changedFiles) {
      counts[f.intent]++
    }
  }

  const sorted = (Object.entries(counts) as [IntentType, number][]).sort((a, b) => b[1] - a[1])
  return sorted[0][0]
}

export function generateCommitMessage(packet: ReviewPacket): string {
  const primaryIntent = getPrimaryIntent(packet)
  const prefix = intentPrefix[primaryIntent]

  const goal = packet.impactMap?.target?.module || packet.taskId
  const subject = `${prefix}: ${goal}`

  const bodyLines: string[] = []
  bodyLines.push('Changed files:')
  for (const f of packet.changedFiles) {
    bodyLines.push(`  ${f.path} [${f.intent}] +${f.additions}/-${f.deletions}`)
  }

  const maxRisk = packet.risks.reduce<RiskLevel | null>((acc, r) => {
    const order: RiskLevel[] = ['low', 'medium', 'high', 'critical']
    if (!acc) return r.level
    return order.indexOf(r.level) > order.indexOf(acc) ? r.level : acc
  }, null)

  const footerLines: string[] = []
  if (maxRisk) {
    footerLines.push(`risk-level: ${maxRisk}`)
  }

  if (packet.impactMap?.contractsTouched?.length) {
    const contractNames = packet.impactMap.contractsTouched.map((c) => c.name).join(', ')
    footerLines.push(`contracts: ${contractNames}`)
  }

  if (packet.hasBreakingChange) {
    footerLines.push('BREAKING CHANGE')
  }

  const parts: string[] = [subject]
  if (bodyLines.length > 1) {
    parts.push('')
    parts.push(bodyLines.join('\n'))
  }
  if (footerLines.length > 0) {
    parts.push('')
    parts.push(footerLines.join('\n'))
  }

  return parts.join('\n')
}
