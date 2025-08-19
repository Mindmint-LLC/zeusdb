import * as util from 'node:util';
import * as Mysql from 'mysql2';
import { IDbProvider } from '../../interfaces/IDbProvider';
import { IMysqlConfig } from '../../interfaces/IMysqlConfig';
import { ExecuteResult, ResultRow } from '../../types/ZeusTypes';
import { ZeusUtil } from '../../util/ZeusUtil';
import { ZeusConnection } from '../ZeusConnection';
import { ZeusDataSource } from '../ZeusDataSource';
import { BaseProvider } from './BaseProvider';

export class MysqlProvider extends BaseProvider implements IDbProvider {
  public name = 'mysql';
  protected _pool: Mysql.Pool | undefined = undefined;
  protected _openConnections: Set<ZeusConnection> = new Set();
  protected _dataSource: ZeusDataSource;
  protected _mysqlConfig: IMysqlConfig;

  constructor(dataSource: ZeusDataSource, configMysql: IMysqlConfig, schema:string='') {
    super();
    this._dataSource = dataSource;
    this._mysqlConfig = this._formatConfig(configMysql, schema);
  }

  get dataSource() {
    return this._dataSource;
  }
  get schema() {
    return this._mysqlConfig?.database ?? '';
  }

  start(): Promise<ZeusConnection> {
    // capture stack trace for debugging
    const startErrorDebug = new Error('Debug: Zeus.MysqlProvider.start');

    return new Promise((resolve, reject) => {
      if (this._dataSource.usePool) {
        if (!this._pool) {
          this._pool = Mysql.createPool(this._mysqlConfig);
        }

        const refTimeout = setTimeout(() => {
          reject(new Error('Zeus.MysqlProvider.start: Error getting connection from pool within timeout'));
        }, this._dataSource.poolTimeout);

        this._pool.getConnection((err: Error | null, connection: Mysql.PoolConnection) => {
          clearTimeout(refTimeout);
          if (err) {
            reject(new Error(`Zeus.MysqlProvider.start: Error getting connection from pool - ${err}`));
            return;
          }

          const conn = new ZeusConnection(this, connection, startErrorDebug);
          conn.throwErrors = this._dataSource.throwErrors;
          this._openConnections.add(conn);
          if (this._dataSource?.showConsoleLogs) {
            console.log(`Zeus.MysqlProvider.start: Opened pooled connection (${this._openConnections.size} opened)`);
          }
          resolve(conn);
        });
      } else {
        // create single connection
        const connection: Mysql.Connection = Mysql.createConnection(this._mysqlConfig);
        connection.connect((err: Error | null) => {
          if (err) {
            reject(new Error(`Zeus.MysqlProvider.start: Error connecting - ${err}`));
            return;
          }
          const conn = new ZeusConnection(this, connection, startErrorDebug);
          conn.throwErrors = this._dataSource.throwErrors;
          this._openConnections.add(conn);
          if (this._dataSource?.showConsoleLogs) {
            console.log(`Zeus.MysqlProvider: Opened connection (${this._openConnections.size} opened)`);
          }
          resolve(conn);
        });
      }
    });
  }

  async end(conn: ZeusConnection): Promise<void> {
    if (!conn) {
      return;
    }
    try {
      if (this._dataSource.usePool) {
        const poolConn = conn.connection as Mysql.PoolConnection;
        poolConn.release();
      } else {
        const singleConn = conn.connection as Mysql.Connection;
        await util.promisify(singleConn.end).bind(singleConn)();
      }
    } catch (err) {
      throw err;
    }
    this._openConnections.delete(conn);
    conn.__dispose();
  }

  async disconnectAll(): Promise<void> {
    for (const conn of this._openConnections) {
      await this.end(conn);
    }
    if (this._pool) {
      await util.promisify(this._pool.end).bind(this._pool)();
      this._pool = undefined;
    }
  }

  get connectionCount(): number {
    return this._openConnections.size;
  }

  applyToConnections(callback: (conn: ZeusConnection) => void): void {
    for (const conn of this._openConnections) {
      callback(conn);
    }
  }

  async query(conn: ZeusConnection, _sql: string, _params?: any[]): Promise<ResultRow[]> {
    if (!conn || !conn.isOpened() || !conn.connection) {
      throw new Error('Zeus.MysqlProvider.query: Connection not open');
    }

    return new Promise((resolve, reject) => {
      (conn.connection as Mysql.Connection).query(_sql, _params, (err: Error | null, results: any) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(results);
      });
    });
  }

  async execute(conn: ZeusConnection, _sql: string, _params?: any[]): Promise<ExecuteResult> {
    if (!conn || !conn.isOpened() || !conn.connection) {
      throw new Error('Zeus.MysqlProvider.execute: Connection not open');
    }

    return new Promise((resolve, reject) => {
      (conn.connection as Mysql.Connection).execute(_sql, _params, (err: Error | null, result: any, _fields: any) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({
          affectedRows: result?.affectedRows ?? 0,
          insertId: result?.insertId ?? 0,
        });
      });
    });
  }

  async batchExecute(conn: ZeusConnection, sqlCommands: string): Promise<Array<ExecuteResult | Error>> {
    if (!conn || !conn.isOpened() || !conn.connection) {
      throw new Error('Zeus.MysqlProvider.batchExecute: Connection not open');
    }

    if (!this._dataSource?.batchExecuteAlwaysSplit && this._mysqlConfig.multipleStatements) {
      try {
        const result = await this.execute(conn, sqlCommands);
        return [result];
      } catch (err) {
        return [err as Error];
      }
    }

    const queries = ZeusUtil.splitSqlStatements(sqlCommands);
    const results: Array<ExecuteResult | Error> = [];

    for (const query of queries) {
      try {
        const result = await this.execute(conn, query);
        results.push(result);
      } catch (err) {
        results.push(err as Error);
      }
    }

    return results;
  }

  async begin(conn: ZeusConnection): Promise<void> {
    if (!conn || !conn.isOpened() || !conn.connection) {
      throw new Error('Zeus.MysqlProvider.begin: Connection not open');
    }
    return new Promise((resolve, reject) => {
      (conn.connection as Mysql.Connection).beginTransaction((err: Error | null) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
  async commit(conn: ZeusConnection): Promise<void> {
    if (!conn || !conn.isOpened() || !conn.connection) {
      throw new Error('Zeus.MysqlProvider.commit: Connection not open');
    }
    return new Promise((resolve, reject) => {
      (conn.connection as Mysql.Connection).commit((err: Error | null) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
  async rollback(conn: ZeusConnection): Promise<void> {
    if (!conn || !conn.isOpened() || !conn.connection) {
      throw new Error('Zeus.MysqlProvider.rollback: Connection not open');
    }
    return new Promise((resolve, reject) => {
      (conn.connection as Mysql.Connection).rollback((err: Error | null) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
}
