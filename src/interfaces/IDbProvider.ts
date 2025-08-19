import { type ZeusConnection } from '../library/ZeusConnection';
import { type ZeusDataSource } from '../library/ZeusDataSource';
import { ExecuteResult, ResultRow } from '../types/ZeusTypes';

export interface IDbProvider {
  dataSource: ZeusDataSource;
  name: string;
  schema: string;

  start(): Promise<ZeusConnection>;

  end(conn: ZeusConnection): Promise<void>;

  disconnectAll(): Promise<void>;

  connectionCount: number;
  applyToConnections(callback: (conn: ZeusConnection) => void): void;

  query(conn: ZeusConnection, sql: string, params?: any[]): Promise<ResultRow[]>;
  execute(conn: ZeusConnection, sql: string, params?: any[]): Promise<ExecuteResult>;
  batchExecute(conn: ZeusConnection, sql: string): Promise<Array<ExecuteResult | Error>>;

  begin(conn: ZeusConnection): Promise<void>;
  commit(conn: ZeusConnection): Promise<void>;
  rollback(conn: ZeusConnection): Promise<void>;
}
