
// graphql/mutations/personalGanttMutations.ts
import { gql } from "@apollo/client"

export const CREATE_PERSONAL_GANTT_TASK_MUTATION = gql`
  mutation CreatePersonalGanttTask($input: CreatePersonalGanttTaskInput!) {
    createPersonalGanttTask(input: $input) {
      id
      name
      start
      end
      progress
      type
      personalSectionId
      hideChildren
      displayOrder
      description
      originalTaskId
      originalType
      __typename
    }
  }
`

export const UPDATE_PERSONAL_GANTT_TASK_MUTATION = gql`
  mutation UpdatePersonalGanttTask($input: UpdatePersonalGanttTaskInput!) {
    updatePersonalGanttTask(input: $input) {
      id
      name
      start
      end
      progress
      type
      personalSectionId
      hideChildren
      displayOrder
      description
      originalTaskId
      originalType
      __typename
    }
  }
`

export const UPDATE_PERSONAL_SECTION_MUTATION = gql`
  mutation UpdatePersonalSection($id: ID!, $name: String, $order: Int) {
    updatePersonalSection(id: $id, name: $name, order: $order) {
      id
      name
      order
      __typename
    }
  }
`
