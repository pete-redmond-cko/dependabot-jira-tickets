import axios from 'axios'
import * as core from '@actions/core'

type ActiveSprint = {
  id: string
  self: string
  state: string
  name: string
  startDate?: string
  endDate?: string
  originBoardId?: string
  goal?: string
}

type SprintResponse = {
  maxResults: number
  startAt: number
  total: number
  isLast: boolean
  values: ActiveSprint[]
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createTicketPayload = ({
  projectKey,
  activeSprintField,
  activeSprintId,
  summary,
  pullRequestUrl,
  labels
}: {
  projectKey: string
  activeSprintField: string
  activeSprintId: string
  summary: string
  pullRequestUrl: string
  labels: string[]
}) => {
  const issue = {
    fields: {
      project: {
        key: projectKey
      },
      labels,
      summary,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text:
                  'Full details about the package update can be found on the '
              },
              {
                type: 'text',
                text: 'pull request',
                marks: [
                  {
                    type: 'link',
                    attrs: {
                      href: pullRequestUrl
                    }
                  }
                ]
              }
            ]
          }
        ]
      },
      issuetype: {
        name: 'Task'
      },
      [activeSprintField]: activeSprintId
    }
  }

  return issue
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createJiraApiInstance = (host: string, token: string) => {
  const instance = axios.create({
    headers: {
      Authorization: `Basic ${token}`
    }
  })

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const get = async <ResponseType>(url: string) => {
    try {
      const response = await instance.get<ResponseType>(url, {})
      return response.data
    } catch (e) {
      throw e
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const post = async <RequestType, ResponseType>(
    url: string,
    data: RequestType
  ) => {
    return instance.post<ResponseType>(url, data, {})
  }

  const getActiveSprint = async (
    boardId: string
  ): Promise<ActiveSprint | null> => {
    try {
      const response = await get<SprintResponse>(
        `${host}/rest/agile/1.0/board/${boardId}/sprint?state=active`
      )

      if (response.values.length === 0) {
        return null
      }

      const [activeSprint] = response.values

      return activeSprint
    } catch {
      throw new Error('Error: error fetching active sprint')
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const createTicket = async (params: {
    projectKey: string
    activeSprintId: string
    activeSprintField: string
    transitionId: string
    summary: string
    pullRequestUrl: string
    labels: string[]
  }) => {
    const payload = createTicketPayload(params)

    core.debug(`Creating ticket: ${JSON.stringify(payload, null, 2)}`)

    try {
      const response = await post<typeof payload, {key: string}>(
        `${host}/rest/api/3/issue`,
        payload
      )

      await post(`${host}/rest/api/3/issue/${response.data.key}/transitions`, {
        transition: {id: params.transitionId}
      })

      return response.data.key
    } catch (e) {
      core.debug(e)
    }
  }

  return {
    getActiveSprint,
    createTicket
  }
}
