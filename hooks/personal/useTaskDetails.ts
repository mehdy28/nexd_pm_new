// hooks/personal/useTaskDetails.ts
import { useQuery, useMutation } from "@apollo/client";
import { useCallback, useMemo } from "react";
import { GET_PERSONAL_TASK_DETAILS_QUERY } from "@/graphql/queries/personal/getPersonalTaskDetails";
import {
  CREATE_TASK_COMMENT_MUTATION,
  DELETE_TASK_COMMENT_MUTATION,
  GET_ATTACHMENT_UPLOAD_SIGNATURE_MUTATION,
  CONFIRM_ATTACHMENT_UPLOAD_MUTATION,
  DELETE_ATTACHMENT_MUTATION,
} from "@/graphql/mutations/taskDetailsMutations";
import { TaskDetailsUI, CommentUI, AttachmentUI } from "@/types/taskDetails";
import { mapPriorityToUI, mapTaskStatusToUI } from "../useProjectTasksAndSections";


export function useTaskDetails(taskId: string | null) {
  const { data, loading, error, refetch } = useQuery(GET_PERSONAL_TASK_DETAILS_QUERY, {
    variables: { id: taskId },
    skip: !taskId,
    // This policy ensures we always fetch from the network when the sheet opens
    fetchPolicy: "network-only", 
  });

  const [createCommentMutation, { loading: creatingComment }] = useMutation(CREATE_TASK_COMMENT_MUTATION);
  const [deleteCommentMutation, { loading: deletingComment }] = useMutation(DELETE_TASK_COMMENT_MUTATION);
  
  const [getUploadSignatureMutation, { loading: gettingSignature }] = useMutation(GET_ATTACHMENT_UPLOAD_SIGNATURE_MUTATION);
  const [confirmUploadMutation, { loading: confirmingUpload }] = useMutation(CONFIRM_ATTACHMENT_UPLOAD_MUTATION);
  const [deleteAttachmentMutation, { loading: deletingAttachment }] = useMutation(DELETE_ATTACHMENT_MUTATION);

  const taskDetails: TaskDetailsUI | null = useMemo(() => {
    // THE FIX IS HERE: We now correctly read from `data.personalTask` instead of `data.task`.
    if (!data?.personalTask) return null;
    const task = data.personalTask;
    return {
      ...task,
      priority: mapPriorityToUI(task.priority),
      status: mapTaskStatusToUI(task.status),
    };
  }, [data]);

  const addComment = useCallback(async (content: string) => {
    if (!taskId) return;
    return createCommentMutation({
      variables: { taskId, content },
      update: (cache, { data: { createTaskComment } }) => {
        const existingData = cache.readQuery<{ personalTask: TaskDetailsUI }>({
          query: GET_PERSONAL_TASK_DETAILS_QUERY,
          variables: { id: taskId },
        });

        if (existingData?.personalTask) {
          cache.writeQuery({
            query: GET_PERSONAL_TASK_DETAILS_QUERY,
            variables: { id: taskId },
            data: {
              personalTask: {
                ...existingData.personalTask,
                comments: [...existingData.personalTask.comments, createTaskComment],
              },
            },
          });
        }
      },
    });
  }, [taskId, createCommentMutation]);

  const deleteComment = useCallback(async (commentId: string) => {
    if (!taskId) return;
    return deleteCommentMutation({
      variables: { id: commentId },
      update: (cache) => {
        cache.modify({
          id: cache.identify({ __typename: 'Task', id: taskId }),
          fields: {
            comments(existingComments: CommentUI[] = [], { readField }) {
              return existingComments.filter(
                comment => readField('id', comment) !== commentId
              );
            },
          },
        });
      },
    });
  }, [taskId, deleteCommentMutation]);

  const uploadAttachment = useCallback(async (file: File) => {
    if (!taskId) throw new Error("Task ID is required for upload.");

    // 1. Get a signature from our backend
    const { data: signatureData } = await getUploadSignatureMutation({ variables: { taskId } });
    const { signature, timestamp, apiKey, cloudName } = signatureData.getAttachmentUploadSignature;

    // 2. Prepare form data and upload directly to Cloudinary
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);
    formData.append('folder', `attachments/${taskId}`);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: 'POST',
      body: formData,
    });
    const cloudinaryResponse = await response.json();

    if (!response.ok) {
        throw new Error(cloudinaryResponse.error.message || 'Cloudinary upload failed');
    }

    // 3. Confirm the upload with our backend
    return confirmUploadMutation({
      variables: {
        input: {
            taskId,
            publicId: cloudinaryResponse.public_id,
            url: cloudinaryResponse.secure_url,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
        }
      },
      update: (cache, { data: { confirmAttachmentUpload } }) => {
          const existingData = cache.readQuery<{ personalTask: TaskDetailsUI }>({
            query: GET_PERSONAL_TASK_DETAILS_QUERY,
            variables: { id: taskId },
          });

          if (existingData?.personalTask) {
            cache.writeQuery({
              query: GET_PERSONAL_TASK_DETAILS_QUERY,
              variables: { id: taskId },
              data: {
                personalTask: {
                  ...existingData.personalTask,
                  attachments: [...existingData.personalTask.attachments, confirmAttachmentUpload],
                },
              },
            });
          }
      }
    });
  }, [taskId, getUploadSignatureMutation, confirmUploadMutation]);

  const deleteAttachment = useCallback(async (attachmentId: string) => {
    if (!taskId) return;
    return deleteAttachmentMutation({
        variables: { id: attachmentId },
        update: (cache) => {
            cache.modify({
                id: cache.identify({ __typename: 'Task', id: taskId }),
                fields: {
                    attachments(existingAttachments: AttachmentUI[] = [], { readField }) {
                        return existingAttachments.filter(
                            attachment => readField('id', attachment) !== attachmentId
                        );
                    }
                }
            })
        }
    })
  }, [taskId, deleteAttachmentMutation]);

  return {
    // State
    taskDetails,
    loading,
    error,
    isMutating: creatingComment || deletingComment || gettingSignature || confirmingUpload || deletingAttachment,

    // Actions
    refetch,
    addComment,
    deleteComment,
    uploadAttachment,
    deleteAttachment,
  };
}