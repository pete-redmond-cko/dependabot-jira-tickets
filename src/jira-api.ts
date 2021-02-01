import axios from 'axios'

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

const IN_REVIEW = '81'
const ACTIVE_SPRINT_FIELD = 'customfield_10122'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createTicketPayload = ({
  projectKey,
  activeSprintId,
  summary,
  pullRequestUrl
}: {
  projectKey: string
  activeSprintId: string
  summary: string
  pullRequestUrl: string
}) => {
  const issue = {
    fields: {
      project: {
        key: projectKey
      },
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
      IssueTransition: {
        id: IN_REVIEW
      },
      [ACTIVE_SPRINT_FIELD]: activeSprintId
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
    summary: string
    pullRequestUrl: string
  }) => {
    const payload = createTicketPayload(params)

    const response = await post<typeof payload, {key: string}>(
      `${host}/rest/api/3/issue`,
      payload
    )

    return response.data.key
  }

  return {
    getActiveSprint,
    createTicket
    // createTicket: () => {}
  }
}
