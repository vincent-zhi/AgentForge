import simpleGit from 'simple-git'
import { SettingsService } from '../settings/settings-service'

async function parseRepoInfo(projectPath: string): Promise<{ owner: string; repo: string } | null> {
  try {
    const git = simpleGit(projectPath)
    const remotes = await git.getRemotes(true)
    const origin = remotes.find((r) => r.name === 'origin')
    if (!origin?.refs?.fetch && !origin?.refs?.push) return null

    const url = origin.refs.fetch || origin.refs.push
    const sshMatch = url.match(/git@github\.com:([^/]+)\/([^/.]+)(?:\.git)?$/)
    if (sshMatch) {
      return { owner: sshMatch[1], repo: sshMatch[2] }
    }
    const httpsMatch = url.match(/https:\/\/github\.com\/([^/]+)\/([^/.]+)(?:\.git)?$/)
    if (httpsMatch) {
      return { owner: httpsMatch[1], repo: httpsMatch[2] }
    }
    return null
  } catch {
    return null
  }
}

export async function createPullRequest(
  projectPath: string,
  branchName: string,
  prInfo: { title: string; body: string; labels: string[]; reviewers: string[] }
): Promise<{ prUrl: string; prNumber: number }> {
  const git = simpleGit(projectPath)
  await git.push('origin', branchName)

  const settingsService = new SettingsService()
  const token = await settingsService.get('githubToken')
  if (!token) {
    throw new Error('GitHub token not configured. Set githubToken in settings.')
  }

  const repoInfo = await parseRepoInfo(projectPath)
  if (!repoInfo) {
    throw new Error('Could not determine GitHub repository from remote URL.')
  }

  const { owner, repo } = repoInfo

  const prResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: prInfo.title,
      body: prInfo.body,
      head: branchName,
      base: 'main',
    }),
  })

  if (!prResponse.ok) {
    const errorBody = await prResponse.text()
    throw new Error(`GitHub API error: ${prResponse.status} ${errorBody}`)
  }

  const prData = (await prResponse.json()) as { number: number; html_url: string }

  if (prInfo.labels.length > 0) {
    await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${prData.number}/labels`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ labels: prInfo.labels }),
    })
  }

  if (prInfo.reviewers.length > 0) {
    await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prData.number}/requested_reviewers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reviewers: prInfo.reviewers }),
    })
  }

  return {
    prUrl: prData.html_url,
    prNumber: prData.number,
  }
}
