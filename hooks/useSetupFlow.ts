// hooks/useSetupFlow.ts
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@apollo/client"; // Corrected: Still using @apollo/client's useMutation
import { SETUP_WORKSPACE_MUTATION } from "@/graphql/mutations/setupWorkspace"; // Adjust path as per your project

interface StepData {
  workspaceName: string;
  workspaceDescription: string;
  projectName: string;
  projectDescription: string;
  industry: string;
  teamSize: string;
  workFields: string[];
}

const steps = [
  { id: 1, title: "Create Workspace" },
  { id: 2, title: "Create Project" },
  { id: 3, title: "Choose Industry" },
  { id: 4, title: "Team Size" },
  { id: 5, title: "Work Fields" },
  { id: 6, title: "All Set!" },
];

export const industries = [
  "Technology", "Healthcare", "Finance", "Marketing", "Retail", "Consulting", "Design", "Other",
];

export const teamSizes = ["Just me", "2-5 people", "6-30 people", "30+ people"];

export const workFieldsOptions = [
  "Business Analysis", "Product Management", "Consulting", "Strategy", "Project Management",
  "Data Analysis", "Process Improvement", "Change Management", "Business Development", "Market Research",
];


// --- IMPORTANT ---
// The useSetupFlow hook now ACCEPTS userId as an argument.
// It is the responsibility of the component using this hook (app/setup/page.tsx)
// to provide the userId from the context it receives.
export function useSetupFlow(userId: string | null | undefined) { // userId is now an argument
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [data, setData] = useState<StepData>({
    workspaceName: "",
    workspaceDescription: "",
    projectName: "",
    projectDescription: "",
    industry: "",
    teamSize: "",
    workFields: [],
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Using @apollo/client's useMutation
  const [setupWorkspaceMutation, { loading: mutationLoading, error: mutationError, data: mutationData }] = useMutation(SETUP_WORKSPACE_MUTATION);

  useEffect(() => {
    if (mutationData?.setupWorkspace?.id) {
      console.log("[useSetupFlow] Workspace setup successfully:", mutationData.setupWorkspace);
      setSubmitError(null);
      // No direct Apollo cache manipulation or ME_QUERY refetch within the hook itself,
      // as per your command "NOTHING MORE".
      // Any cache updates or ME_QUERY refetches should be handled by the consuming component
      // or a higher-level context if needed after this mutation completes.

      // Redirect to the new workspace's dashboard using the slug
      
      //router.push(`/workspace/${mutationData.setupWorkspace.slug}`);

      router.push(`/workspace`);
    }
    if (mutationError) {
      setSubmitError(mutationError.message);
      console.error("[useSetupFlow] Setup mutation failed:", mutationError);
    }
  }, [mutationData, mutationError, router]);

  const nextStep = () => {
    if (!isStepValid()) return;
    if (currentStep < steps.length) {
      setCompletedSteps((prev) => [...prev, currentStep]);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const updateData = useCallback(<F extends keyof StepData>(field: F, value: StepData[F]) => {
    setData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const toggleWorkField = useCallback((field: string) => {
    const currentFields = data.workFields;
    const newFields = currentFields.includes(field)
      ? currentFields.filter((f) => f !== field)
      : [...currentFields, field];
    updateData("workFields", newFields);
  }, [data.workFields, updateData]);

  const isStepValid = useCallback(() => {
    switch (currentStep) {
      case 1:
        return data.workspaceName.trim() !== "" && data.workspaceDescription.trim() !== "";
      case 2:
        return data.projectName.trim() !== "" && data.projectDescription.trim() !== "";
      case 3:
        return data.industry !== "";
      case 4:
        return data.teamSize !== "";
      case 5:
        return data.workFields.length > 0;
      default:
        return true;
    }
  }, [currentStep, data]);

  const handleSubmitSetup = async () => {
    // Corrected: Check userId argument passed to the hook
    if (!userId) {
      setSubmitError("User ID is not available. Please ensure you are logged in.");
      return;
    }
    if (!isStepValid() && currentStep !== 6) {
      setSubmitError("Please complete all required fields.");
      return;
    }

    setSubmitError(null); // Clear previous errors

    try {
      await setupWorkspaceMutation({
        variables: {
          userId: userId, // Use the userId passed as an argument
          workspaceName: data.workspaceName,
          workspaceDescription: data.workspaceDescription,
          projectName: data.projectName,
          projectDescription: data.projectDescription,
          industry: data.industry,
          teamSize: data.teamSize,
          workFields: data.workFields,
        },
      });
    } catch (error: any) {
      // Error already handled by mutationError and useEffect
      // setSubmitError will be set by useEffect
    }
  };

  return {
    currentStep,
    setCurrentStep,
    completedSteps,
    data,
    updateData,
    toggleWorkField,
    isStepValid,
    nextStep,
    handleSubmitSetup,
    isSubmitting: mutationLoading,
    submitError,
    steps,
    industries,
    teamSizes,
    workFieldsOptions,
  };
}