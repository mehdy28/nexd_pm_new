import { gql } from "@apollo/client"

export const GET_MY_TASKS_AND_SECTIONS_QUERY = gql`
  query GetMyTasksAndSections {
    getMyTasksAndSections {
      personalSections {
        id
        name
        tasks {
          id
          title
          description
          status
          priority
          endDate
          startDate
          points
          completed
          personalSectionId
          assignee {
            id
            firstName
            lastName
            avatar
            __typename
          }
          __typename
        }
        __typename
      }
      __typename
    }
  }
`