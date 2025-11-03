import { gql } from "@apollo/client"

export const DELETE_PERSONAL_TASK_MUTATION = gql`
  mutation DeletePersonalTask($id: ID!) {
    deletePersonalTask(id: $id) {
      id
    }
  }
`