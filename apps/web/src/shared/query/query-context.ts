import { QueryClient } from '@tanstack/react-query';

/** Router-Kontext: ein QueryClient pro Request bzw. pro Browser-Sitzung. */
export const createQueryContext = () => ({
  queryClient: new QueryClient(),
});
