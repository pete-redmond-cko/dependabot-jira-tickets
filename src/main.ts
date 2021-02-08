import * as core from '@actions/core'
import * as github from '@actions/github'
import {createJiraApiInstance} from './jira-api'
import {getPullReqestDetails} from './github'

async function run(): Promise<void> {
  const JIRA_HOST = core.getInput('JIRA_HOST', {required: true})
  const JIRA_API_TOKEN = core.getInput('JIRA_API_TOKEN', {required: true})
  const JIRA_BOARD_ID = core.getInput('JIRA_BOARD_ID', {required: true})
  const GITHUB_TOKEN = core.getInput('GITHUB_TOKEN', {required: true})
  const JIRA_PROJECT_KEY = core.getInput('JIRA_PROJECT_KEY', {required: true})

  if (github.context.ref.startsWith('dependabot/')) {
    return
  }

  try {
    const {getActiveSprint, createTicket} = createJiraApiInstance(
      JIRA_HOST,
      JIRA_API_TOKEN
    )

    const activeSprint = await getActiveSprint(JIRA_BOARD_ID)

    if (activeSprint === null) {
      core.setFailed(`Failure: no active sprints`)
      return
    }

    const pullRequestDetails = getPullReqestDetails()

    const createdTicket = await createTicket({
      activeSprintId: activeSprint.id,
      projectKey: JIRA_PROJECT_KEY,
      summary: pullRequestDetails.title,
      pullRequestUrl: pullRequestDetails.html_url || ''
    })

    const octokit = github.getOctokit(GITHUB_TOKEN)

    await octokit.pulls.update({
      owner: pullRequestDetails.owner,
      repo: pullRequestDetails.repo,
      pull_number: pullRequestDetails.number,
      body: pullRequestDetails.body,
      title: `${createdTicket} - ${pullRequestDetails.title}`
    })
  } catch (err) {
    core.setFailed(`Failure: ${err.message}`)
  }
}

run()
