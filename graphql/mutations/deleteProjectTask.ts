// graphql/mutations/deleteProjectTask.ts
import { gql } from '@apollo/client';

export const DELETE_PROJECT_TASK_MUTATION = gql`
  mutation DeleteProjectTask($id: ID!) {
    deleteProjectTask(id: $id) {
      id # Assuming you want to return the ID of the deleted task for client-side cache updates
      # You can request more fields here if needed for specific cache logic,
      # but for a simple refetch, just the ID is usually enough.
      # For example, if you need the sprintId to do a targeted refetch in Apollo cache updates:
      # sprintId
      # sectionId
    }
  }
`;