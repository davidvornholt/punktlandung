import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { Schema } from 'effect';

import { sessionRequired } from '#/shared/auth/auth-middleware.ts';
import { berlinCalendarDate } from '#/shared/date/calendar-date.ts';
import { learningStatisticsKey } from '#/shared/query/query-keys.ts';
import { runServerEffect } from '#/shared/runtime.ts';
import { StudyDayInput } from '../schemas/study-day-schema.ts';
import {
  listStudyDays,
  loadLearningStatistics,
  logStudyDay,
} from '../services/learning-service.ts';

export const logLerntagFn = createServerFn({ method: 'POST' })
  .middleware([sessionRequired])
  .inputValidator(Schema.standardSchemaV1(StudyDayInput))
  .handler(({ data }) => runServerEffect(logStudyDay(data)));

export const lernStatistikFn = createServerFn({ method: 'GET' })
  .middleware([sessionRequired])
  .handler(() => runServerEffect(loadLearningStatistics(berlinCalendarDate())));

export const listLerntageFn = createServerFn({ method: 'GET' })
  .middleware([sessionRequired])
  .handler(() => runServerEffect(listStudyDays()));

export const learningStatisticsQueryOptions = queryOptions({
  queryKey: learningStatisticsKey,
  queryFn: () => lernStatistikFn(),
});
