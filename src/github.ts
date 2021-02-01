import * as github from '@actions/github'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const getPullReqestDetails = () => {
  const {context} = github

  const {repo} = context

  const {
    payload: {pull_request}
  } = context

  return {...repo, ...pull_request, title: pull_request?.title || ''}
}
