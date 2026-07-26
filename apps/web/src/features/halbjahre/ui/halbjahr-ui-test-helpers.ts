import type { ReactElement } from 'react';
import { isValidElement } from 'react';

import type { HalbjahrMitNotenAnzahl } from '../services/halbjahr-service.ts';

export const createHalbjahr = (
  id: string,
  half: 1 | 2,
  notenAnzahl = 0,
): HalbjahrMitNotenAnzahl => ({
  endsOn: '2027-01-31',
  half,
  id,
  klassenstufe: '10',
  notenAnzahl,
  schoolYear: '2026/27',
  startsOn: '2026-08-01',
  system: 'sechser',
});

export const collectElements = (
  node: unknown,
  type: string,
): Array<ReactElement> => {
  if (Array.isArray(node)) {
    return node.flatMap((child) => collectElements(child, type));
  }
  if (!isValidElement(node)) {
    return [];
  }
  if (typeof node.type === 'function') {
    const Component = node.type as (props: unknown) => unknown;
    return collectElements(Component(node.props), type);
  }
  const { children } = node.props as { readonly children?: unknown };
  return [
    ...(node.type === type ? [node] : []),
    ...collectElements(children, type),
  ];
};

export const textOf = (node: unknown): string => {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(textOf).join('');
  }
  return isValidElement(node)
    ? textOf((node.props as { readonly children?: unknown }).children)
    : '';
};
