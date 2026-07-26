import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { Schema } from 'effect';

import { sessionRequired } from '#/shared/auth/auth-middleware.ts';
import { berlinCalendarDate } from '#/shared/date/calendar-date.ts';
import { runtime } from '#/shared/runtime.ts';
import { StudyDayInput } from '../schemas/study-day-schema.ts';
import {
  listStudyDays,
  loadLearningStatistics,
  logStudyDay,
} from '../services/learning-service.ts';

export const logLerntagFn = createServerFn({ method: 'POST' })
  .middleware([sessionRequired])
  .inputValidator(Schema.standardSchemaV1(StudyDayInput))
  .handler(({ data }) => runtime.runPromise(logStudyDay(data)));

export const lernStatistikFn = createServerFn({ method: 'GET' })
  .middleware([sessionRequired])
  .handler(() =>
    runtime.runPromise(loadLearningStatistics(berlinCalendarDate())),
  );

export const listLerntageFn = createServerFn({ method: 'GET' })
  .middleware([sessionRequired])
  .handler(() => runtime.runPromise(listStudyDays()));

export const learningStatisticsQueryOptions = queryOptions({
  queryKey: ['learning-statistics'],
  queryFn: () => lernStatistikFn(),
});
