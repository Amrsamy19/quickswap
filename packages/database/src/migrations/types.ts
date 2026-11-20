import { DatabaseSync } from 'node:sqlite';

export interface Migration {
  version: number;
  name: string;
  up: (db: DatabaseSync) => void;
  down?: (db: DatabaseSync) => void;
}
