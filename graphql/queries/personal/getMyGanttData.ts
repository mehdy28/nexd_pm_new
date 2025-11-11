import { gql } from "@apollo/client"

export const GET_MY_GANTT_DATA_QUERY = gql`
  query GetMyGanttData {
    getMyGanttData {
      sections {
        id
        name
        __typename
      }
      tasks {
        id
        name
        start
        end
        progress
        type
        project # The ID of the parent project/section
        personalSectionId # parent section ID
        hideChildren
        displayOrder
        description
        originalTaskId # To link back to Task.id for mutations
        originalType # "TASK" or "SECTION"
        __typename
      }
      __typename
    }
  }
`