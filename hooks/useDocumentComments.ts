import { useState } from "react";
import { useMutation } from "@apollo/client";
import {
  CREATE_DOCUMENT_COMMENT,
  DELETE_DOCUMENT_COMMENT,
} from "@/graphql/mutations/document-comment.mutations";

export const useDocumentComments = (documentId: string) => {
  const [newComment, setNewComment] = useState("");

  const [addComment, { loading: addingComment }] = useMutation(
    CREATE_DOCUMENT_COMMENT,
    {
      refetchQueries: ["GetDocumentDetails"],
    }
  );

  const [deleteComment] = useMutation(DELETE_DOCUMENT_COMMENT, {
    refetchQueries: ["GetDocumentDetails"],
  });

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await addComment({
        variables: { documentId, content: newComment.trim() },
      });
      setNewComment("");
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  return {
    newComment,
    setNewComment,
    handleAddComment,
    deleteComment,
    addingComment,
  };
};