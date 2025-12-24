import { gql } from '@apollo/client';
export const CREATE_SPRINT = gql `
  mutation CreateSprint($input: CreateSprintInput!) {
    createSprint(input: $input) {
      id
      name
      description
      startDate
      endDate
      isCompleted
      status
      tasks {
        id
        title
        status
        priority
        dueDate
        points
        completionPercentage
        completed
        assignee {
          id
          firstName
          lastName
          avatar
        }
      }
      milestones {
        id
        name
        dueDate
        isCompleted
      }
    }
  }
`;
export const UPDATE_SPRINT = gql `
  mutation UpdateSprint($input: UpdateSprintInput!) {
    updateSprint(input: $input) {
      id
      name
      description
      startDate
      endDate
      isCompleted
      status
      tasks {
        id
        title
        status
        priority
        dueDate
        points
        completionPercentage
        completed
        assignee {
          id
          firstName
          lastName
          avatar
        }
      }
      milestones {
        id
        name
        dueDate
        isCompleted
      }
    }
  }
`;
export const DELETE_SPRINT = gql `
  mutation DeleteSprint($id: ID!) {
    deleteSprint(id: $id) {
      id
      name
      description
      startDate
      endDate
      isCompleted
      status
      tasks { # Even though it's deleted, the GraphQL schema expects SprintDetails
        id
        title
        status
        priority
        dueDate
        points
        completionPercentage
        completed
        assignee {
          id
          firstName
          lastName
          avatar
        }
      }
      milestones {
        id
        name
        dueDate
        isCompleted
      }
    }
  }
`;
