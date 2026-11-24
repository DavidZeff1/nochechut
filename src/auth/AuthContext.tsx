import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AuthUser, Backend } from '../data/backend';
import type { Invite, UserProfile } from '../lib/types';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'noAccess'; user: AuthUser }
  | { status: 'ready'; user: AuthUser; profile: UserProfile };

const Ctx = createContext<AuthState>({ status: 'loading' });

export function AuthProvider({ backend, children }: { backend: Backend; children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let unsubProfile: (() => void) | undefined;
    const unsubAuth = backend.onAuth((user) => {
      unsubProfile?.();
      if (!user) {
        setState({ status: 'signedOut' });
        return;
      }
      setState({ status: 'loading' });
      let claimed = false;
      unsubProfile = backend.watchDoc<UserProfile>(
        `users/${user.uid}`,
        async (profile) => {
          if (profile) {
            setState({ status: 'ready', user, profile });
            return;
          }
          // First sign-in: turn an invite for this email into a profile.
          if (claimed) return;
          claimed = true;
          try {
            const invite = await backend.getDoc<Invite>(`invites/${user.email}`);
            if (!invite) {
              setState({ status: 'noAccess', user });
              return;
            }
            await backend.setDoc(`users/${user.uid}`, {
              role: invite.role,
              email: user.email,
              name: user.displayName || '',
              instructorName: invite.instructorName || '',
            });
          } catch {
            setState({ status: 'noAccess', user });
          }
        },
        () => setState({ status: 'noAccess', user }),
      );
    });
    return () => {
      unsubAuth();
      unsubProfile?.();
    };
  }, [backend]);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

export function useProfile(): UserProfile {
  const a = useAuth();
  if (a.status !== 'ready') throw new Error('useProfile before sign-in');
  return a.profile;
}
