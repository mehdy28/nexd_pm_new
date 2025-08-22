import { useMutation } from "@apollo/client";
import { gql } from "@apollo/client";
import { initializeApollo } from "@/lib/apollo-client";
import { useToast } from "@/components/ui/use-toast";

const CREATE_USER_MUTATION = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      email
      firstName
      lastName
    }
  }
`;

export const useCreateUser = () => {
  const [createUser, { loading, error }] = useMutation(CREATE_USER_MUTATION);
    const { toast } = useToast()

  const handleCreateUser = async (input: { firebaseUid: string; email: string; firstName?: string; lastName?: string }) => {
    try {
       const apolloClient = initializeApollo();
      const { data } = await apolloClient.mutate({
        mutation: CREATE_USER_MUTATION,
        variables: { input },
      });

      toast({
            title: "Account created!",
            description: "We've created your account for you.",
          })
      return data?.createUser;
    } catch (err:any) {
      console.error("Error creating user:", err);
        toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: err.message,
          })
      return null;
    }
  };

  return { createUser: handleCreateUser, loading, error };
};