import { useMutation } from '@tanstack/react-query';
import {
  createFileRoute,
  Outlet,
  redirect,
  useRouter,
} from '@tanstack/react-router';
import { authClient } from '#/shared/auth/auth-client.ts';
import { rejectAuthError } from '#/shared/auth/auth-response.ts';
import { getSessionFn } from '#/shared/auth/session-fn.ts';
import { ShellFrame } from '#/shared/ui/shell-frame.tsx';
import {
  NotFoundNotice,
  StandaloneLoadError,
  StandalonePending,
} from '#/shared/ui/shell-states.tsx';

const AppShell = () => {
  const router = useRouter();
  const signOutMutation = useMutation({
    mutationFn: () => authClient.signOut().then(rejectAuthError),
    onSuccess: () => router.navigate({ to: '/anmelden' }),
  });

  return (
    <ShellFrame
      signOut={{
        failed: signOutMutation.isError,
        pending: signOutMutation.isPending,
        run: () => signOutMutation.mutate(),
      }}
    >
      <Outlet />
    </ShellFrame>
  );
};

export const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    const session = await getSessionFn();
    if (session === null) {
      throw redirect({ to: '/anmelden' });
    }
    return { session };
  },
  component: AppShell,
  // A page under the shell that does not exist keeps the shell around it.
  notFoundComponent: NotFoundNotice,
  // When the shell itself cannot be loaded, there is no shell to show the error in.
  errorComponent: StandaloneLoadError,
  // Shown when checking the session takes long. Pages load their data inside the shell and say so there.
  pendingComponent: StandalonePending,
});
