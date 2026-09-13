import type { TopicProgress } from '#/shared/markdown/task-lines.ts';

/** „3 von 7 Themen sicher", „alle 4 Themen sicher", „keine Themen". */
export const topicsText = (topics: TopicProgress | null): string => {
  if (topics === null || topics.total === 0) {
    return 'keine Themen';
  }
  if (topics.checked === topics.total) {
    return topics.total === 1
      ? 'das eine Thema sicher'
      : `alle ${topics.total} Themen sicher`;
  }
  return `${topics.checked} von ${topics.total} Themen sicher`;
};
