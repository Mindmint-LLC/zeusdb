import * as Mysql from 'mysql';

export type DataSourceIdentifier = string;

export type ResultRow = { [key: string]: any };
export interface ExecuteResult {
  affectedRows?: number;
  insertId?: number;
}

export type ConnectionRef = Mysql.Connection | any;
