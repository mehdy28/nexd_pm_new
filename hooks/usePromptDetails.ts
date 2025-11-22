// hooks/usePromptDetails.ts
'use client';

import { useState, useCallback } from "react";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client";
import { GET_PROMPT_DETAILS_QUERY, GET_PROMPT_VERSION_CONTENT_QUERY } from "@/graphql/queries/promptRelatedQueries";
import {
    UPDATE_PROMPT_MUTATION,
    SNAPSHOT_PROMPT_MUTATION,
    SET_ACTIVE_PROMPT_VERSION_MUTATION,
    UPDATE_VERSION_DESCRIPTION_MUTATION,
    UPDATE_PROMPT_VERSION_MUTATION,
} from "@/graphql/mutations/promptRelatedMutations";
import { Prompt, PromptVariable, Block, Version as PromptVersionType } from '@/components/prompt-lab/store';

function cuid(prefix: string = ''): string {
    const chars = '01234789abcdefghijklmnopqrstuvwxyz';
    let result = prefix + 'c';
    for (let i = 0; i < 24; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}

interface VersionContent {
    id: string;
    content: Block[];
    context: string;
    variables: PromptVariable[];
    aiEnhancedContent?: string | null;
}

interface UsePromptDetailsHook {
    selectedPromptDetails: Prompt | null;
    loadingDetails: boolean;
    detailsError: string | null;
    updatePromptDetails: (promptId: string, updates: Partial<Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'project' | 'versions' | 'activeVersion'>>) => void;
    updatePromptVersion: (promptId: string, versionId: string, updates: Partial<PromptVersionType>) => void;
    snapshotPrompt: (notes?: string) => Promise<any>;
    setActivePromptVersion: (versionId: string) => Promise<any>;
    updateVersionDescription: (promptId: string, versionId: string, description: string) => void;
    refetchPromptDetails: () => Promise<any>;
    fetchVersionContent: (versionId: string) => void;
    loadingVersionContent: boolean;
    versionContentError: string | null;
    currentLoadedVersionContent: VersionContent | null;
}


export function usePromptDetails(selectedPromptId: string | null, projectId: string | undefined): UsePromptDetailsHook {
    const [selectedPromptDetails, setSelectedPromptDetails] = useState<Prompt | null>(null);
    const [currentLoadedVersionContent, setCurrentLoadedVersionContent] = useState<VersionContent | null>(null);

    const { data: promptDetailsData, loading: apolloDetailsLoading, error: apolloDetailsError, refetch: apolloRefetchPromptDetails } = useQuery(
        GET_PROMPT_DETAILS_QUERY,
        {
            variables: { id: selectedPromptId },
            skip: !selectedPromptId,
            fetchPolicy: "network-only",
            onCompleted: (data) => {
                if (data?.getPromptDetails) {
                    setSelectedPromptDetails({
                        ...data.getPromptDetails,
                        versions: (data.getPromptDetails.versions || []).map((v: any) => ({ ...v, id: v.id || cuid('db-ver-') })),
                    });
                    setCurrentLoadedVersionContent(null);
                }
            }
        }
    );

    const [triggerFetchVersionContent, { loading: apolloLoadingVersionContent, error: apolloVersionContentError }] = useLazyQuery(GET_PROMPT_VERSION_CONTENT_QUERY, {
        fetchPolicy: "network-only",
        onCompleted: (data) => {
            if (data?.getPromptVersionContent) {
                setCurrentLoadedVersionContent({
                    id: data.getPromptVersionContent.id,
                    content: (data.getPromptVersionContent.content || []) as Block[],
                    context: data.getPromptVersionContent.context || '',
                    variables: (data.getPromptVersionContent.variables || []).map((v: any) => ({ ...v, id: v.id || cuid('db-var-') })),
                    aiEnhancedContent: data.getPromptVersionContent.aiEnhancedContent,
                });
            }
        }
    });

    const [updatePromptMutation] = useMutation(UPDATE_PROMPT_MUTATION);

    const [snapshotPromptMutation] = useMutation(SNAPSHOT_PROMPT_MUTATION, {
        onCompleted: (data) => {
            if (data?.snapshotPrompt) {
                // FIX: Update state directly from the mutation response instead of refetching
                setSelectedPromptDetails(prev => {
                    if (!prev) return null;
                    const updatedPrompt = data.snapshotPrompt;
                    return {
                        ...prev,
                        versions: (updatedPrompt.versions || []).map((v: any) => ({ ...v, id: v.id || cuid('db-ver-') })),
                    };
                });
            }
        }
    });

    const [setActivePromptVersionMutation] = useMutation(SET_ACTIVE_PROMPT_VERSION_MUTATION, {
        onCompleted: (data) => {
            if (data?.setActivePromptVersion) {
                // This is our previous fix, which is correct.
                setSelectedPromptDetails({
                    ...data.setActivePromptVersion,
                    versions: (data.setActivePromptVersion.versions || []).map((v: any) => ({ ...v, id: v.id || cuid('db-ver-') })),
                });
                setCurrentLoadedVersionContent(null);
            }
        }
    });

    const [updateVersionDescriptionMutation] = useMutation(UPDATE_VERSION_DESCRIPTION_MUTATION, {
        onCompleted: (data) => {
            if (data?.updateVersionDescription) {
                setSelectedPromptDetails(prev => prev ? { ...prev, versions: data.updateVersionDescription.versions } : null);
            }
        }
    });
    
    const [updatePromptVersionMutation] = useMutation(UPDATE_PROMPT_VERSION_MUTATION, {
        onCompleted: (data) => {
             if (data?.updatePromptVersion) {
                // This refetch is still acceptable for general version updates, though could be optimized further if needed.
                apolloRefetchPromptDetails();
            }
        }
    });
    
    const fetchVersionContent = useCallback((versionId: string) => {
        if (!selectedPromptId || !versionId) return;
        triggerFetchVersionContent({ variables: { promptId: selectedPromptId, versionId } });
    }, [selectedPromptId, triggerFetchVersionContent]);

    const updatePromptDetails = useCallback((promptId: string, updates: any) => {
        const { content, variables, versions, activeVersion, ...metadataUpdates } = updates;
        updatePromptMutation({ variables: { input: { id: promptId, ...metadataUpdates } } });
    }, [updatePromptMutation]);
    
    const updatePromptVersion = useCallback((promptId: string, versionId: string, updates: any) => {
        updatePromptVersionMutation({ variables: { input: { promptId, versionId, ...updates } } });
    }, [updatePromptVersionMutation]);

    const snapshotPrompt = useCallback((notes?: string) => {
        if (!selectedPromptId) throw new Error("No prompt selected to snapshot.");
        return snapshotPromptMutation({ variables: { input: { promptId: selectedPromptId, notes: notes || `Version saved at ${new Date().toLocaleString()}` } } });
    }, [selectedPromptId, snapshotPromptMutation]);

    const setActivePromptVersion = useCallback((versionId: string) => {
        if (!selectedPromptId) throw new Error("No prompt selected.");
        return setActivePromptVersionMutation({ variables: { promptId: selectedPromptId, versionId } });
    }, [selectedPromptId, setActivePromptVersionMutation]);

    const updateVersionDescription = useCallback((promptId: string, versionId: string, description: string) => {
        if (!promptId || !versionId) return;
        updateVersionDescriptionMutation({ variables: { input: { promptId, versionId, description } } });
    }, [updateVersionDescriptionMutation]);

    return {
        selectedPromptDetails,
        loadingDetails: apolloDetailsLoading,
        detailsError: apolloDetailsError?.message || null,
        updatePromptDetails,
        updatePromptVersion,
        snapshotPrompt,
        setActivePromptVersion,
        updateVersionDescription,
        refetchPromptDetails: apolloRefetchPromptDetails,
        fetchVersionContent,
        loadingVersionContent: apolloLoadingVersionContent,
        versionContentError: apolloVersionContentError?.message || null,
        currentLoadedVersionContent,
    };
}