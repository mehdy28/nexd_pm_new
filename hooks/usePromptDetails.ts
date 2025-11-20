'use-client';

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client";
import { GET_PROMPT_DETAILS_QUERY, GET_PROMPT_VERSION_CONTENT_QUERY } from "@/graphql/queries/promptRelatedQueries";
import {
    UPDATE_PROMPT_MUTATION,
    SNAPSHOT_PROMPT_MUTATION,
    RESTORE_PROMPT_VERSION_MUTATION,
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
    updatePromptDetails: (promptId: string, updates: Partial<Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'user' | 'project' | 'versions'>>) => void;
    updatePromptVersion: (promptId: string, versionId: string, updates: Partial<PromptVersionType>) => void;
    snapshotPrompt: (notes?: string) => void;
    restorePromptVersion: (versionId: string) => void;
    updateVersionDescription: (promptId: string, versionId: string, description: string) => void;
    refetchPromptDetails: () => Promise<any>;
    fetchVersionContent: (versionId: string) => void;
    loadingVersionContent: boolean;
    versionContentError: string | null;
    currentLoadedVersionContent: VersionContent | null;
}


export function usePromptDetails(selectedPromptId: string | null, projectId: string | undefined): UsePromptDetailsHook {
    console.log(`[usePromptDetails] Hook rendering/re-rendering. selectedPromptId: ${selectedPromptId}`);

    const [selectedPromptDetails, setSelectedPromptDetails] = useState<Prompt | null>(null);
    const [currentLoadedVersionContent, setCurrentLoadedVersionContent] = useState<VersionContent | null>(null);

    // --- DATA FETCHING ---
    const { data: promptDetailsData, loading: apolloDetailsLoading, error: apolloDetailsError, refetch: apolloRefetchPromptDetails } = useQuery(
        GET_PROMPT_DETAILS_QUERY,
        {
            variables: { id: selectedPromptId },
            skip: !selectedPromptId,
            fetchPolicy: "network-only",
            onCompleted: (data) => {
                if (data?.getPromptDetails) {
                    console.log(`[usePromptDetails] [onCompleted: GET_PROMPT_DETAILS_QUERY] Received data for prompt ID: ${data.getPromptDetails.id}. Syncing state.`);
                    const detailedPrompt: Prompt = {
                        ...data.getPromptDetails,
                        content: (data.getPromptDetails.content || []) as Block[],
                        variables: (data.getPromptDetails.variables || []).map((v: any) => ({ ...v, id: v.id || cuid('db-var-') })),
                        versions: (data.getPromptDetails.versions || []).map((v: any) => ({ ...v, id: v.id || cuid('db-ver-') })),
                    };
                    setSelectedPromptDetails(detailedPrompt);
                    setCurrentLoadedVersionContent(null);
                } else {
                    console.warn(`[usePromptDetails] [onCompleted: GET_PROMPT_DETAILS_QUERY] Query completed but returned no data.`);
                }
            }
        }
    );

    const [triggerFetchVersionContent, { data: versionContentData, loading: apolloLoadingVersionContent, error: apolloVersionContentError }] = useLazyQuery(GET_PROMPT_VERSION_CONTENT_QUERY, {
        fetchPolicy: "network-only",
        onCompleted: (data) => {
            if (data?.getPromptVersionContent) {
                console.log(`[usePromptDetails] [onCompleted: GET_PROMPT_VERSION_CONTENT_QUERY] Received data for version ID: ${data.getPromptVersionContent.id}. Syncing loaded version content.`);
                setCurrentLoadedVersionContent({
                    id: data.getPromptVersionContent.id,
                    content: (data.getPromptVersionContent.content || []) as Block[],
                    context: data.getPromptVersionContent.context || '',
                    variables: (data.getPromptVersionContent.variables || []).map((v: any) => ({ ...v, id: v.id || cuid('db-var-') })),
                    aiEnhancedContent: data.getPromptVersionContent.aiEnhancedContent,
                });
            } else {
                console.warn(`[usePromptDetails] [onCompleted: GET_PROMPT_VERSION_CONTENT_QUERY] Query completed but returned no data.`);
            }
        }
    });

    // --- MUTATIONS WITH onCompleted HANDLERS (NO refetchQueries) ---

    const [updatePromptMutation] = useMutation(UPDATE_PROMPT_MUTATION, {
        onCompleted: (data) => {
            if (data?.updatePrompt) {
                console.log(`[usePromptDetails] [onCompleted: UPDATE_PROMPT_MUTATION] Received updated prompt data. Updating state.`);
                setSelectedPromptDetails(prev => {
                    console.log(`[usePromptDetails] [setState: updatePrompt] Previous state:`, prev);
                    const newState = prev ? { ...prev, ...data.updatePrompt } : null;
                    console.log(`[usePromptDetails] [setState: updatePrompt] New state:`, newState);
                    return newState;
                });
            }
        }
    });

    const [snapshotPromptMutation] = useMutation(SNAPSHOT_PROMPT_MUTATION, {
        onCompleted: (data) => {
            if (data?.snapshotPrompt) {
                console.log(`[usePromptDetails] [onCompleted: SNAPSHOT_PROMPT_MUTATION] Received new versions list. Updating state.`);
                setSelectedPromptDetails(prev => {
                    console.log(`[usePromptDetails] [setState: snapshotPrompt] Previous state:`, prev);
                    const newState = prev ? { ...prev, versions: data.snapshotPrompt.versions } : null;
                    console.log(`[usePromptDetails] [setState: snapshotPrompt] New state:`, newState);
                    return newState;
                });
            }
        }
    });

    const [restorePromptVersionMutation] = useMutation(RESTORE_PROMPT_VERSION_MUTATION, {
        onCompleted: (data) => {
            if (data?.restorePromptVersion) {
                console.log(`[usePromptDetails] [onCompleted: RESTORE_PROMPT_VERSION_MUTATION] Received restored prompt data. Updating state.`);
                setSelectedPromptDetails(prev => {
                    console.log(`[usePromptDetails] [setState: restorePromptVersion] Previous state:`, prev);
                    const newState = prev ? { ...prev, ...data.restorePromptVersion } : null;
                    console.log(`[usePromptDetails] [setState: restorePromptVersion] New state:`, newState);
                    return newState;
                });
                setCurrentLoadedVersionContent(null);
            }
        }
    });

    const [updateVersionDescriptionMutation] = useMutation(UPDATE_VERSION_DESCRIPTION_MUTATION, {
        onCompleted: (data) => {
            if (data?.updateVersionDescription) {
                console.log(`[usePromptDetails] [onCompleted: UPDATE_VERSION_DESCRIPTION_MUTATION] Received updated versions list. Updating state.`);
                setSelectedPromptDetails(prev => {
                    console.log(`[usePromptDetails] [setState: updateVersionDescription] Previous state:`, prev);
                    const newState = prev ? { ...prev, versions: data.updateVersionDescription.versions } : null;
                    console.log(`[usePromptDetails] [setState: updateVersionDescription] New state:`, newState);
                    return newState;
                });
            }
        }
    });
    
    const [updatePromptVersionMutation] = useMutation(UPDATE_PROMPT_VERSION_MUTATION, {
        onCompleted: (data) => {
            if (data?.updatePromptVersion) {
                console.log(`[usePromptDetails] [onCompleted: UPDATE_PROMPT_VERSION_MUTATION] Received updated versions list for prompt ID: ${data.updatePromptVersion.id}.`);
                setSelectedPromptDetails(prev => {
                    if (!prev) return null;
                    console.log(`[usePromptDetails] [setState: updatePromptVersion] Previous state version count: ${prev.versions.length}`);
                    const newState = { ...prev, versions: data.updatePromptVersion.versions };
                    console.log(`[usePromptDetails] [setState: updatePromptVersion] New state version count: ${newState.versions.length}`);
                    return newState;
                });
            }
        }
    });

    // --- ACTION HANDLERS ---
    
    const fetchVersionContent = useCallback((versionId: string) => {
        console.log(`[usePromptDetails] [Action: fetchVersionContent] Called with versionId: ${versionId}`);
        if (!selectedPromptId || !versionId) {
            console.warn(`[usePromptDetails] [Action: fetchVersionContent] Aborted: missing promptId or versionId.`);
            return;
        }
        const variables = { promptId: selectedPromptId, versionId };
        console.log(`[usePromptDetails] [Action: fetchVersionContent] Triggering lazy query with variables:`, variables);
        triggerFetchVersionContent({ variables });
    }, [selectedPromptId, triggerFetchVersionContent]);

    const updatePromptDetails = useCallback((promptId: string, updates: any) => {
        console.log(`[usePromptDetails] [Action: updatePromptDetails] Called for promptId: ${promptId}`);
        const variables = { input: { id: promptId, ...updates } };
        console.log(`[usePromptDetails] [Action: updatePromptDetails] Executing mutation with variables:`, variables);
        updatePromptMutation({ variables });
    }, [updatePromptMutation]);
    
    const updatePromptVersion = useCallback((promptId: string, versionId: string, updates: any) => {
        console.log(`[usePromptDetails] [Action: updatePromptVersion] Called for versionId: ${versionId}`);
        const variables = { input: { promptId, versionId, ...updates } };
        console.log(`[usePromptDetails] [Action: updatePromptVersion] Executing mutation with variables:`, variables);
        updatePromptVersionMutation({ variables });
    }, [updatePromptVersionMutation]);

    const snapshotPrompt = useCallback((notes?: string) => {
        console.log(`[usePromptDetails] [Action: snapshotPrompt] Called.`);
        if (!selectedPromptId) {
            console.warn(`[usePromptDetails] [Action: snapshotPrompt] Aborted: missing selectedPromptId.`);
            return;
        }
        const variables = { input: { promptId: selectedPromptId, notes: notes || `Version saved at ${new Date().toLocaleString()}` } };
        console.log(`[usePromptDetails] [Action: snapshotPrompt] Executing mutation with variables:`, variables);
        snapshotPromptMutation({ variables });
    }, [selectedPromptId, snapshotPromptMutation]);

    const restorePromptVersion = useCallback((versionId: string) => {
        console.log(`[usePromptDetails] [Action: restorePromptVersion] Called for versionId: ${versionId}`);
        if (!selectedPromptId) {
            console.warn(`[usePromptDetails] [Action: restorePromptVersion] Aborted: missing selectedPromptId.`);
            return;
        }
        const variables = { input: { promptId: selectedPromptId, versionId } };
        console.log(`[usePromptDetails] [Action: restorePromptVersion] Executing mutation with variables:`, variables);
        restorePromptVersionMutation({ variables });
    }, [selectedPromptId, restorePromptVersionMutation]);

    const updateVersionDescription = useCallback((promptId: string, versionId: string, description: string) => {
        console.log(`[usePromptDetails] [Action: updateVersionDescription] Called for versionId: ${versionId}`);
        if (!promptId || !versionId) {
            console.warn(`[usePromptDetails] [Action: updateVersionDescription] Aborted: missing promptId or versionId.`);
            return;
        }
        const variables = { input: { promptId, versionId, description } };
        console.log(`[usePromptDetails] [Action: updateVersionDescription] Executing mutation with variables:`, variables);
        updateVersionDescriptionMutation({ variables });
    }, [updateVersionDescriptionMutation]);

    return {
        selectedPromptDetails,
        loadingDetails: apolloDetailsLoading,
        detailsError: apolloDetailsError?.message || null,
        updatePromptDetails,
        updatePromptVersion,
        snapshotPrompt,
        restorePromptVersion,
        updateVersionDescription,
        refetchPromptDetails: apolloRefetchPromptDetails,
        fetchVersionContent,
        loadingVersionContent: apolloLoadingVersionContent,
        versionContentError: apolloVersionContentError?.message || null,
        currentLoadedVersionContent,
    };
}
