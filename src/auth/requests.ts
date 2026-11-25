import { useEffect, useState } from 'react';
import type { Backend } from '../data/backend';
import type { AccessRequest } from '../lib/types';

export const requestPath = (email: string) => `accessRequests/${email.trim().toLowerCase()}`;

/** The signed-in person's own request, live. `undefined` while loading, `null` when there is none. */
export function useMyRequest(backend: Backend, email: string) {
  const [req, setReq] = useState<AccessRequest | null | undefined>(undefined);
  useEffect(
    () =>
      backend.watchDoc<AccessRequest>(
        requestPath(email),
        (d) => setReq(d ?? null),
        () => setReq(null),
      ),
    [backend, email],
  );
  return req;
}
