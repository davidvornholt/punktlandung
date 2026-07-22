import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools';

/** Panel-Plugin für die TanStack-Devtools-Leiste (nur im Dev-Build aktiv). */
export const tanstackQueryDevtoolsPlugin = {
  name: 'TanStack Query',
  render: <ReactQueryDevtoolsPanel />,
};
