import { z } from 'zod';

const defaultPort = 3000;
const minimumPort = 1;
const maximumPort = 65_535;
const portSchema = z.coerce
  .number()
  .int()
  .min(minimumPort)
  .max(maximumPort)
  .default(defaultPort);

export const parsePort = (value: unknown): number => {
  const result = portSchema.safeParse(value);
  if (!result.success) {
    throw new Error(
      `Ungültiger PORT: erwartet wird eine ganze Zahl zwischen 1 und 65535. ${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
};
