import pg from 'pg';

const postgresDateOid = 1082;

/** DATE-Werte sind Kalenderdaten und dürfen nie durch eine Zeitzone laufen. */
export const preservePostgresDates = (): void => {
  pg.types.setTypeParser(postgresDateOid, (value) => value);
};
