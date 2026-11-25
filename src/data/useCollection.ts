import { useEffect, useState } from 'react';
import { useData } from './DataContext';

/** A live collection that the main data context does not load (users, invites, accessRequests). Admins only. */
export function useCollection<T>(col: string) {
  const { backend } = useData();
  const [docs, setDocs] = useState<Record<string, T>>({});
  useEffect(
    () =>
      backend.watchCollection<T>(
        col,
        (s) => setDocs(s.docs),
        () => setDocs({}),
      ),
    [backend, col],
  );
  return docs;
}
