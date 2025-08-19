import { type IDbConfig } from '../interfaces/IDbConfig';
import { IDbProvider } from '../interfaces/IDbProvider';
import { ZeusUtil } from '../util/ZeusUtil';
import { MysqlProvider } from './providers/MysqlProvider';
import { ZeusConnection } from './ZeusConnection';
import { ExecuteResult, ResultRow } from '../types/ZeusTypes';

export class ZeusDataSource {
  protected _id: string;
  protected _showConsoleLogs: boolean;
  protected _usePool: boolean;
  protected _poolTimeout: number;
  protected _batchExecuteAlwaysSplit: boolean;
  protected _throwErrors: boolean;

  protected _provider: IDbProvider | undefined = undefined;

  /**
   * Constructor is internal, do not use directly.
   * Use ZeusDB.registerDataSource() instead.
   *
   * The config.id will either be `{datasourceName}` if the datasource contains a database schema,
   *   otherwise it will be `{datasourceName}.{schemaName}`
   *   If the id is not provided, a UUID will be generated. A special `!` prefix is
   *     used to indicate a generated id.
   *
   * @see ZeusDB.registerDataSource
   */
  constructor(config: IDbConfig, schema:string='') {
    this._id = ZeusUtil.formatDatasourceId(config.id, schema);
    this._showConsoleLogs = config.showConsoleLogs ?? false;
    this._usePool = config.usePool ?? true;
    this._poolTimeout = config.poolTimeout ?? 30000;
    this._batchExecuteAlwaysSplit = config.batchExecuteAlwaysSplit ?? true;
    this._throwErrors = config.throwErrors ?? true;

    if (config.mysql) {
      this._provider = new MysqlProvider(this, config.mysql, schema);
    }
    // TODO add other database providers here
    if (!this._provider) {
      throw new Error('ZeusConfig: Unsupported database configuration');
    }
  }



  get provider(): IDbProvider {
    return this._provider!;
  }

  get id(): string {
    return this._id;
  }
  get showConsoleLogs(): boolean {
    return this._showConsoleLogs;
  }
  get usePool(): boolean {
    return this._usePool;
  }
  get poolTimeout(): number {
    return this._poolTimeout;
  }
  get batchExecuteAlwaysSplit(): boolean {
    return this._batchExecuteAlwaysSplit;
  }
  get schema(): string {
    return this._provider?.schema ?? '';
  }

  get throwErrors(): boolean {
    return this._throwErrors;
  }
  set throwErrors(value: boolean) {
    this._throwErrors = value;
    if (this._provider) {
      this._provider.applyToConnections((conn: ZeusConnection) => {
        conn.throwErrors = value;
      });
    }
  }

  /**
   * Connect to the data source and return a ZeusConnection.
   * This method will throw errors, so be sure to handle them properly.
   */
  public async connect(): Promise<ZeusConnection> {
    return this._provider!.start();
  }

  /**
   * Get the number of active connections to the data source.
   * TODO: This may contain connections that are closed/errored, need to filter or clean up periodically.
   */
  public get connectionCount(): number {
    return this._provider!.connectionCount;
  }

  /**
   * Disconnect all connections for the data source, including pooled connections.
   * Removes the pools and closes all connections.
   * New pools and connections will be created as needed.
   */
  public async disconnectAll(): Promise<void> {
    return this._provider!.disconnectAll();
  }


  /** @internal */
  protected _handleTemplateQuery(arg1: any, ...rest: any[]): [string, any[]] {
    let sql, params;
    if (Array.isArray(arg1) && 'raw' in arg1) {
      [sql, params] = ZeusUtil.formatTemplateQuery(arg1 as TemplateStringsArray, ...rest);
    } else {
      sql = arg1;
      params = rest[0] ?? [];
    }
    return [sql, params];
  }


  // ####################################################################################################
  // Helper Methods, for direct "single-shot" queries

  /**
   * Starts a new connection in a transaction and returns the connection.
   * Remember to call `connection.commit()` or `connection.rollback()` when finished,
   *   and always call `connection.close()` to release the connection back to the pool.
   *
   * Example:
   * ```typescript
   *   const conn = await db.begin();
   *   try {
   *     const result = await conn.execute(`INSERT INTO table (title) VALUES (?)`, [title]);
   *     const newId = result.insertId;
   *     const result = await conn.execute(`INSERT INTO tableChild (parentId, title) VALUES (?, ?)`, [newId, childTitle]);
   *     await conn.commit();
   *     await conn.close();
   *   } catch (err) {
   *     await conn.rollback();
   *     await conn.close();
   *     throw err;
   *   }
   * ```
   * @see ZeusConnection.commit
   * @see ZeusConnection.rollback
   */
  public async begin():Promise<ZeusConnection|Error> {
    const conn = await this.connect();
    const result = await conn.begin();
    if (result) {
      await conn.close();
      return result;
    }
    return conn;
  }

  /**
   * Execute a single query and returns a single value (from the first row, first column).
   * Do not use within transactions, use the connection reference directly.
   *
   * Example:
   * ```typescript
   *    const title = await db.queryScalar(`SELECT title FROM table WHERE id=?`, [id]);
   * ```
   */
  public async queryScalar(sql: string, params?: any[]): Promise<any|Error>;
  /**
   * Execute a single query and returns a single value (from the first row, first column).
   * Do not use within transactions, use the connection reference directly.
   *
   * Example:
   * ```typescript
   *    const title = await db.queryScalar`SELECT title FROM table WHERE id=${id}`;
   * ```
   */
  public async queryScalar(templateStrings: TemplateStringsArray, ...params: any[]): Promise<any|Error>;
  /** @internal */
  public async queryScalar(arg1: any, ...rest: any[]): Promise<any|Error> {
      let [sql, params] = this._handleTemplateQuery(arg1, ...rest);
      const conn = await this.connect();
      const results = await conn.queryScalar(sql, params);
      await conn.close();
      return results;
  }

  /**
   * Execute a single query and returns the result set.
   * Do not use within transactions, use the connection reference directly.
   *
   * Example:
   * ```typescript
   *    const results = await db.query(`SELECT * FROM table WHERE hidden=?`, [showHidden]);
   * ```
   */
  public async query(sql: string, params?: any[]): Promise<ResultRow[]|Error>;
  /**
   * Execute a single query and returns the result set.
   * Do not use within transactions, use the connection reference directly.
   *
   * Example:
   * ```typescript
   *    const results = await db.query`SELECT * FROM table WHERE hidden = ${showHidden}`;
   * ```
   */
  public async query(templateStrings: TemplateStringsArray, ...params: any[]): Promise<ResultRow[]|Error>;
  /** @internal */
  public async query(arg1: any, ...rest: any[]): Promise<ResultRow[]|Error> {
    let [sql, params] = this._handleTemplateQuery(arg1, ...rest);
    const conn = await this.connect();
    const results = await conn.query(sql, params);
    await conn.close();
    return results;
  }

  /**
   * Alias: query
   * @see query
   */
  public async queryRows(sql: string, params?: any[]): Promise<ResultRow[]|Error>;
  /**
   * Alias: query
   * @see query
   */
  public async queryRows(templateStrings: TemplateStringsArray, ...params: any[]): Promise<ResultRow[]|Error>;
  /** @internal */
  public async queryRows(arg1: any, ...rest: any[]): Promise<ResultRow[]|Error> {
    return this.query(arg1, ...rest);
  }

  /**
   * Execute a single query and returns the first row.
   * Do not use within transactions, use the connection reference directly.
   *
   * Example:
   * ```typescript
   *    const result = await db.queryRow(`SELECT * FROM table WHERE id = ?`, [id]);
   * ```
   */
  public async queryRow(sql: string, params?: any[]): Promise<ResultRow|null|Error>;
  /**
   * Execute a single query and returns the first row.
   * Do not use within transactions, use the connection reference directly.
   *
   * Example:
   * ```typescript
   *    const result = await db.queryRow`SELECT * FROM table WHERE id = ${id}`;
   * ```
   */
  public async queryRow(templateStrings: TemplateStringsArray, ...params: any[]): Promise<ResultRow|null|Error>;
  /** @internal */
  public async queryRow(arg1: any, ...rest: any[]): Promise<ResultRow|null|Error> {
    let [sql, params] = this._handleTemplateQuery(arg1, ...rest);
    const conn = await this.connect();
    const results = await conn.queryRow(sql, params);
    await conn.close();
    return results;
  }

  /**
   * Execute a single query and returns affected rows and newly inserted id.
   * Do not use within transactions, use the connection reference directly.
   *
   * Example:
   * ```typescript
   *    const result = await db.execute(`INSERT INTO table (title) VALUES (?)`, [title]);
   *    console.log(result.affectedRows, result.insertId);
   * ```
   */
  public async execute(sql: string, params?: any[]): Promise<ExecuteResult|Error>;
  /**
   * Execute a single query and returns affected rows and newly inserted id.
   * Do not use within transactions, use the connection reference directly.
   *
   * Example:
   * ```typescript
   *    const result = await db.execute`INSERT INTO table (title) VALUES (${title})`;
   *    console.log(result.affectedRows, result.insertId);
   * ```
   */
  public async execute(templateStrings: TemplateStringsArray, ...params: any[]): Promise<ExecuteResult|Error>;
  /** @internal */
  public async execute(arg1: any, ...rest: any[]): Promise<ExecuteResult|Error> {
    let [sql, params] = this._handleTemplateQuery(arg1, ...rest);
    const conn = await this.connect();
    const results = await conn.execute(sql, params);
    await conn.close();
    return results;
  }

  /**
   * Executes multiple queries and returns an array of affected rows and newly inserted id for each.
   * Do not use within transactions, use the connection reference directly.
   */
  public async batchExecute(sql: string, params?: any[]): Promise<Array<ExecuteResult|Error>|Error>;
  /**
   * Executes multiple queries and returns an array of affected rows and newly inserted id for each.
   * Do not use within transactions, use the connection reference directly.
   */
  public async batchExecute(templateStrings: TemplateStringsArray, ...params: any[]): Promise<Array<ExecuteResult|Error>|Error>;
  /** @internal */
  public async batchExecute(arg1: any, ...rest: any[]): Promise<Array<ExecuteResult|Error>|Error> {
    let [sql, _params] = this._handleTemplateQuery(arg1, ...rest);
    const conn = await this.connect();
    const results = await conn.batchExecute(sql);
    await conn.close();
    return results;
  }





}
