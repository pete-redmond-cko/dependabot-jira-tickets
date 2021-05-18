import * as core from '@actions/core'
import * as github from '@actions/github'
import {createJiraApiInstance} from './jira-api'
import {getPullReqestDetails} from './github'

async function run(): Promise<void> {
  const JIRA_HOST = core.getInput('JIRA_HOST', {required: true})
  const JIRA_API_TOKEN = core.getInput('JIRA_API_TOKEN', {required: true})
  const JIRA_BOARD_ID = core.getInput('JIRA_BOARD_ID', {required: true})
  const JIRA_TRANSITION_ID = core.getInput('JIRA_TRANSITION_ID', {
    required: true
  })
  const JIRA_ACTIVE_SPRINT_FIELD = core.getInput('JIRA_ACTIVE_SPRINT_FIELD', {
    required: true
  })
  const GITHUB_TOKEN = core.getInput('GITHUB_TOKEN', {required: true})
  const JIRA_PROJECT_KEY = core.getInput('JIRA_PROJECT_KEY', {required: true})
  const LABELS = core.getInput('JIRA_LABELS').split(',')

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const GITHUB_REF = process.env.GITHUB_HEAD_REF!

  core.debug(`Ref -> ${GITHUB_REF}`)

  if (!GITHUB_REF.startsWith('dependabot/')) {
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

    core.debug(`Active sprint: ${activeSprint.id}`)

    const pullRequestDetails = getPullReqestDetails()

    const createdTicket = await createTicket({
      activeSprintId: activeSprint.id,
      activeSprintField: JIRA_ACTIVE_SPRINT_FIELD,
      transitionId: JIRA_TRANSITION_ID,
      projectKey: JIRA_PROJECT_KEY,
      summary: pullRequestDetails.title,
      pullRequestUrl: pullRequestDetails.html_url || '',
      labels: LABELS
    })

    core.debug(`Created ticket: ${createdTicket}`)

    const octokit = github.getOctokit(GITHUB_TOKEN)

    await octokit.pulls.update({
      owner: pullRequestDetails.owner,
      repo: pullRequestDetails.repo,
      pull_number: pullRequestDetails.number,
      body: pullRequestDetails.body,
      title: `${createdTicket} - ${pullRequestDetails.title}`
    })
  } catch (error) {
    core.setFailed(`Failure: ${error.message}`)

    core.debug(error.response?.data)
    core.debug(error.response?.status)
    core.debug(error.response?.headers)
  }
}

run()
