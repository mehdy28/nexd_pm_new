// components/project/create-project-modal.tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react"; // Added Loader2 for loading state

import { useCreateProjectModal } from "@/hooks/useCreateProject"; // Import the hook

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWorkspaceId: string; // Add currentWorkspaceId prop
  onProjectCreated?: (projectId: string) => void; // Optional callback
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  currentWorkspaceId,
  onProjectCreated,
}) => {
  const {
    projectName,
    setProjectName,
    projectDescription,
    setProjectDescription,
    handleSubmit,
    loading,
    error,
  } = useCreateProjectModal(currentWorkspaceId, onClose, onProjectCreated); // Pass currentWorkspaceId and onClose

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] md:max-w-[900px] bg-white">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="projectName" className="text-left text-base mb-1">
              Project Name
            </Label>
            <Input
              id="projectName"
              className="col-span-3 border-[#4ab5ae]"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              disabled={loading} // Disable input while loading
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="projectDescription" className="text-left text-base mb-1">
              Project Description
            </Label>
            <Textarea
              id="projectDescription"
              className="col-span-3 h-48 border-[#4ab5ae] overflow-y-auto"
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              disabled={loading} // Disable input while loading
            />
          </div>
          {error && (
            <p className="col-span-4 text-center text-red-600 text-sm">
              Error: {error.message}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !projectName.trim()} // Disable if loading or project name is empty
            className="bg-[#4ab5ae] text-white hover:bg-[#4ab5ae]"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              "Create Project"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProjectModal;