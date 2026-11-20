import { Migration } from './types';
import { SCHEMA_SQL } from '../schema';

export const migration001: Migration = {
  version: 1,
  name: 'initial_schema',
  up: (db) => {
    db.exec(SCHEMA_SQL);
  },
};
