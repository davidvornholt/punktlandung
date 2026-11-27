import { useMutation } from '@tanstack/react-query';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { authClient } from '#/shared/auth/auth-client.ts';
import { rejectAuthError } from '#/shared/auth/auth-response.ts';
import { getSessionFn } from '#/shared/auth/session-fn.ts';
import { pageTitle } from '#/shared/ui/page-title.ts';
import { SignInView } from '#/shared/ui/shell-sign-in.tsx';
import { StandalonePending } from '#/shared/ui/shell-states.tsx';

const SignInPage = () => {
  const signInMutation = useMutation({
    mutationFn: () =>
      authClient.signIn
        .social({ provider: 'github', callbackURL: '/' })
        .then(rejectAuthError),
  });
  return (
    <SignInView
      failed={signInMutation.isError}
      onSignIn={() => signInMutation.mutate()}
      pending={signInMutation.isPending}
    />
  );
};

export const Route = createFileRoute('/anmelden')({
  beforeLoad: async () => {
    const session = await getSessionFn();
    if (session !== null) {
      throw redirect({ to: '/' });
    }
  },
  component: SignInPage,
  pendingComponent: StandalonePending,
  head: () => ({ meta: [{ title: pageTitle('Anmelden') }] }),
});
