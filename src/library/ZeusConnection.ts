import { IDbProvider } from '../interfaces/IDbProvider';
import { ConnectionRef, ExecuteResult, ResultRow } from '../types/ZeusTypes';
import { ZeusUtil } from '../util/ZeusUtil';

export class ZeusConnection {
  protected _startErrorDebug: Error | undefined = undefined;
  protected _errorLast: Error | undefined = undefined;
  protected _result: ResultRow[] = [];
  protected _resultCount: number = 0;
  protected _resultCursor: number = 0;
  protected _inTransaction: boolean = false;
  protected _insertId: number = 0;
  protected _affectedRows: number = 0;
  protected _opened: boolean = false;
  protected _openedTimestamp: number = 0;
  protected _uuid: string;
  protected _throwErrors: boolean = true;
  protected _provider: IDbProvider;

  protected _connection: ConnectionRef;

  /**
   * Constructor is internal, do not use directly.
   *
   * Use ZeusDB.connect() to create a new connection,
   *   or an instance of ZeusDataSource and calling .connect()
   *
   * @see ZeusDB.connect
   * @see ZeusConfig.connect
   */
  constructor(provider: IDbProvider, connection: ConnectionRef, startErrorDebug?: Error) {
    this._provider = provider;
    this._uuid = ZeusUtil.generateUuid();
    this._opened = true;
    this._openedTimestamp = ZeusUtil.getTimestamp();
    this._connection = connection;
    this._startErrorDebug = startErrorDebug ?? new Error('Debug: ZeusConnection.constructor');

    if (this._provider?.dataSource?.showConsoleLogs) {
      console.log(`ZeusConnection: Opened ${this._uuid}`);
    }
  }

  // ##################################################################################################################
  // Connection, Start, End Commands
  // ##################################################################################################################

  public isOpened(): boolean {
    return this._opened;
  }

  public async close(): Promise<void | Error> {
    if (!this._opened) {
      return;
    }
    try {
      await this._provider!.end(this);
    } catch (err) {
      return this._dispatchError(`ZeusConnection.close: Error closing connection\n${err}`);
    }
  }

  /**
   * alias
   * @see close */
  public async disconnect(): Promise<void | Error> {
    return this.close();
  }
  /** alias
   * @see close */
  public async end(): Promise<void | Error> {
    return this.close();
  }
  /** alias
   * @see close */
  public async release(): Promise<void | Error> {
    return this.close();
  }

  // ##################################################################################################################
  // Query and Execute Commands
  // ##################################################################################################################

  /**
   * Execute a SQL query that returns results as an array of ResultRow objects.
   *
   * The placeholders are sent as named parameters securely to the database.
   * @param _sql - string with ? placeholders
   * @param _params - array of parameters to replace ? placeholders
   * @returns Promise<ResultRow[]|Error> as the result of the query
   */
  public async query(_sql: string, _params?: any[]): Promise<ResultRow[] | Error>;
  /**
   * Execute a SQL query with template literal tagging and return results as an array of ResultRow objects.
   *
   * The template variables are sent as named parameters securely to the database.
   * Example:
   * ```typescript
   * const result = await conn.query`SELECT * FROM users WHERE id = ${userId}`;
   * ```
   * @returns Promise<ResultRow[]|Error> as the result of the query
   */
  public async query(strings: TemplateStringsArray, ...values: any[]): Promise<ResultRow[] | Error>;
  /** @internal */
  public async query(arg1: any, ...rest: any[]): Promise<ResultRow[] | Error> {
    if (!this.isOpened()) {
      return this._dispatchError('ZeusConnection.query: Connection not open');
    }
    if (!this._provider) {
      return this._dispatchError('ZeusConnection.query: No provider');
    }
    if (typeof arg1 === 'string') {
      // Called with (sql, params)
      const _sql = arg1;
      const _params = rest[0] ?? [];
      try {
        const results = await this._provider.query(this, _sql, _params);
        if (Array.isArray(results)) {
          this._resultCount = results.length;
          this._result = [...results]; //shallow copy
          this._resultCursor = 0;
        } else {
          this._resetResult();
        }
        return results;
      } catch (err) {
        return this._dispatchError(`ZeusConnection.query: Error executing query - ${_sql}\n${err}`);
      }
    } else if (Array.isArray(arg1) && 'raw' in arg1) {
      // Called as a tagged template
      const [sql, params] = ZeusUtil.formatTemplateQuery(arg1 as TemplateStringsArray, ...rest);
      return this.query(sql, params);
    } else {
      return this._dispatchError('ZeusConnection.query: Invalid arguments');
    }
  }

  /**
   * Execute a SQL query and return the first row of the result.
   *
   * The placeholders are sent as named parameters securely to the database.
   * @param _sql - string with ? placeholders
   * @param _params - array of parameters to replace ? placeholders
   * @returns Promise<ResultRow|Error|null> as the first row of the result, or null if no rows are returned
   */
  public async queryRow(_sql: string, _params?: any[]): Promise<ResultRow | Error | null>;
  /**
   * Execute a SQL query with template literal and return the first row of the result.
   *
   * The template variables are sent as named parameters securely to the database.
   * Example:
   * ```typescript
   * const result = await conn.queryRow`SELECT * FROM users WHERE id = ${userId}`;
   * ```
   * @returns Promise<ResultRow|Error|null> as the first row of the result, or null if no rows are returned
   */
  public async queryRow(strings: TemplateStringsArray, ...values: any[]): Promise<ResultRow | Error | null>;
  /** @internal */
  public async queryRow(arg1: any, ...rest: any[]): Promise<ResultRow | Error | null> {
    const result = await this.query(arg1, ...rest);
    if (result instanceof Error) {
      return result;
    }
    this._resultCount = 1;
    return result?.[0] ?? null;
  }

  /** alias
   * @see query */
  public async queryRows(_sql: string, _params?: any[]): Promise<ResultRow[] | Error>;
  /** alias
   * @see query */
  public async queryRows(strings: TemplateStringsArray, ...values: any[]): Promise<ResultRow[] | Error>;
  /** @internal */
  public async queryRows(arg1: any, ...rest: any[]): Promise<ResultRow[] | Error> {
    return this.query(arg1, ...rest);
  }

  /**
   * Execute a SQL query and return a single value (first field in the first row).
   *
   * The placeholders are sent as named parameters securely to the database.
   * @param _sql - string with ? placeholders
   * @param _params - array of parameters to replace ? placeholders
   * @returns Promise<any> of the single value (first field of the first row), or null if no rows are returned
   */
  public async queryScalar(_sql: string, _params?: any[]): Promise<any | Error | null>;
  /**
   * Execute a SQL query with template literal and return a single value (first field in the first row).
   *
   * The template variables are sent as named parameters securely to the database.
   * Example:
   * ```typescript
   * const result = await conn.queryScalar`SELECT COUNT(*) FROM users`;
   * ```
   * @returns Promise<any> of the single value (first field of the first row), or null if no rows are returned
   */
  public async queryScalar(strings: TemplateStringsArray, ...values: any[]): Promise<any | Error | null>;
  /** @internal */
  public async queryScalar(arg1: any, ...rest: any[]): Promise<any | Error | null> {
    const result = await this.query(arg1, ...rest);
    if (result instanceof Error) {
      return result;
    }
    this._resultCount = 1;
    return result?.[0]?.[Object.keys(result[0])[0]] ?? null;
  }

  /**
   * Execute a SQL command that returns affected row count and newly inserted id, if applicable.
   *
   * The placeholders are sent as named parameters securely to the database.
   * @param _sql - string with ? placeholders
   * @param _params - array of parameters to replace ? placeholders
   * @returns Promise<ExecuteResult|Error> - contains affectedRows and insertId if applicable
   */
  public async execute(_sql: string, _params?: any[]): Promise<ExecuteResult | Error>;
  /**
   * Execute a SQL command that returns affected row count and newly inserted id, if applicable.
   * *
   * The template variables are sent as named parameters securely to the database.
   * Example:
   * ```typescript
   * await conn.execute`INSERT INTO users (name) VALUES (${userName})`;
   * ```
   * @returns Promise<ExecuteResult|Error> - contains affectedRows and insertId if applicable
   */
  public async execute(strings: TemplateStringsArray, ...values: any[]): Promise<ExecuteResult | Error>;
  /** @internal */
  public async execute(arg1: any, ...rest: any[]): Promise<ExecuteResult | Error> {
    if (!this.isOpened()) {
      return this._dispatchError('ZeusConnection.execute: Connection not open');
    }
    if (!this._provider) {
      return this._dispatchError('ZeusConnection.execute: No provider');
    }
    if (typeof arg1 === 'string') {
      // Called with (sql, params)
      const _sql = arg1;
      const _params = rest[0] ?? [];
      try {
        const results = await this._provider.execute(this, _sql, _params);
        this._insertId = results?.insertId ?? 0;
        this._affectedRows = results?.affectedRows ?? 0;
        this._resetResult();
        return results;
      } catch (err) {
        return this._dispatchError(`ZeusConnection.execute: Error executing query - ${_sql}\n${err}`);
      }
    } else if (Array.isArray(arg1) && 'raw' in arg1) {
      // Called as a tagged template
      const [sql, params] = ZeusUtil.formatTemplateQuery(arg1 as TemplateStringsArray, ...rest);
      return this.execute(sql, params);
    } else {
      return this._dispatchError('ZeusConnection.execute: Invalid arguments');
    }
  }

  /**
   * Execute a batch of SQL commands that return affected rows and newly inserted ids, if applicable.
   */
  public async batchExecute(sql: string): Promise<Array<ExecuteResult | Error> | Error>;
  /**
   * Execute a batch of SQL commands that return affected rows and newly inserted ids, if applicable.
   */
  public async batchExecute(
    strings: TemplateStringsArray,
    ...values: any[]
  ): Promise<Array<ExecuteResult | Error> | Error>;
  /** @internal */
  public async batchExecute(arg1: any, ...rest: any[]): Promise<Array<ExecuteResult | Error> | Error> {
    if (!this.isOpened()) {
      return this._dispatchError('ZeusConnection.batchExecute: Connection not open');
    }
    if (!this._provider) {
      return this._dispatchError('ZeusConnection.batchExecute: No provider');
    }
    if (typeof arg1 === 'string') {
      // Called with (sql, params)
      try {
        const results = await this._provider.batchExecute(this, arg1);
        this._insertId = 0;
        this._affectedRows = 0;
        this._resetResult();
        return results;
      } catch (err) {
        return this._dispatchError(`ZeusConnection.batchExecute: Error executing batch query\n${err}`);
      }
    } else if (Array.isArray(arg1) && 'raw' in arg1) {
      // Called as a tagged template, no params for batchExecute supported!
      if (rest.length > 0) {
        return this._dispatchError('ZeusConnection.batchExecute: No variables/parameters supported for batchExecute');
      }
      const sql = ZeusUtil.formatTemplateString(arg1 as TemplateStringsArray);
      return this.batchExecute(sql);
    } else {
      return this._dispatchError('ZeusConnection.batchExecute: Invalid arguments');
    }
  }

  // ##################################################################################################################
  // Transaction Commands
  // ##################################################################################################################

  /**
   * Begin a transaction on this connection.
   * Only one transaction can be active per connection at a time.
   * Use commit() or rollback() to end the transaction.
   * @see commit
   * @see rollback
   */
  public async begin(): Promise<void | Error> {
    if (!this.isOpened()) {
      return this._dispatchError('ZeusConnection.beginTransaction: Connection not open');
    }
    if (!this._provider) {
      return this._dispatchError('ZeusConnection.beginTransaction: No provider');
    }
    if (this._inTransaction) {
      return this._dispatchError('ZeusConnection.beginTransaction: Already in a transaction');
    }
    try {
      await this._provider.begin(this);
      this._inTransaction = true;
    } catch (err) {
      return this._dispatchError(`ZeusConnection.beginTransaction: Error beginning transaction\n${err}`);
    }
  }
  /** alias
   * @see begin */
  public async beginTransaction(): Promise<void | Error> {
    return this.begin();
  }

  /**
   * Commit a transaction, allowing all changes to be saved.
   * Only one transaction can be active per connection at a time.
   * Use begin() to start a transaction, and rollback() to undo changes.
   * @see begin
   * @see rollback
   */
  public async commit(): Promise<void | Error> {
    if (!this.isOpened()) {
      return this._dispatchError('ZeusConnection.commit: Connection not open');
    }
    if (!this._provider) {
      return this._dispatchError('ZeusConnection.commit: No provider');
    }
    if (!this._inTransaction) {
      return this._dispatchError('ZeusConnection.rollback: Not in a transaction');
    }
    try {
      await this._provider.commit(this);
      this._inTransaction = false;
    } catch (err) {
      return this._dispatchError(`ZeusConnection.commit: Error committing transaction\n${err}`);
    }
  }

  /**
   * Rollback a transaction, undoing all changes made during the transaction.
   * Only one transaction can be active per connection at a time.
   * Use begin() to start a transaction, and commit() to save changes.
   * @see begin
   * @see commit
   */
  public async rollback(): Promise<void | Error> {
    if (!this.isOpened()) {
      return this._dispatchError('ZeusConnection.rollback: Connection not open');
    }
    if (!this._provider) {
      return this._dispatchError('ZeusConnection.rollback: No provider');
    }
    if (!this._inTransaction) {
      return this._dispatchError('ZeusConnection.rollback: Not in a transaction');
    }
    try {
      await this._provider.rollback(this);
      this._inTransaction = false;
    } catch (err) {
      return this._dispatchError(`ZeusConnection.rollback: Error rolling back transaction\n${err}`);
    }
  }

  // ##################################################################################################################
  // Data Set / Cursor
  // ##################################################################################################################

  /**
   * Check if there are more rows to read in the result set.
   */
  public hasRows(): boolean {
    return this._resultCursor < this._resultCount;
  }

  /**
   * Alias for hasRows
   * @see hasRows
   */
  public hasNext(): boolean {
    return this.hasRows();
  }

  /**
   * Get the number of rows in the result set.
   */
  public get rowCount(): number {
    return this._resultCount;
  }
  /** alias
   * @see result */
  public get rows(): ResultRow[] {
    return this._result;
  }

  /**
   * Reset the cursor to the beginning of the result set.
   */
  public async resetCursor(): Promise<void> {
    this._resultCursor = 0;
  }

  /**
   * Gets the current row without moving the cursor forward.
   */
  public get row(): ResultRow | null {
    if (this._resultCursor < this._resultCount) {
      return this._result[this._resultCursor];
    }
    return null;
  }
  /**
   * Returns the next row in the result set, or null if there are no more rows.
   * Calling this method does move the cursor forward.
   * */
  public async next(): Promise<ResultRow | null> {
    if (this._resultCursor < this._resultCount) {
      return this._result[this._resultCursor++];
    }
    return null;
  }

  /**
   * @internal
   * Adds support for iteration over rows, such as `for (const row of db)`
   * */
  public *[Symbol.iterator]() {
    for (let row of this._result) {
      yield row;
    }
  }

  // ##################################################################################################################
  // Internal
  // ##################################################################################################################

  /**
   * @internal
   * Used to dispatch errors by either throwing them or logging them to the console.
   * */
  protected _dispatchError(mess: string): Error {
    const error = new Error(mess, {
      cause: this._startErrorDebug,
    });
    this._errorLast = error;
    if (this._throwErrors) {
      throw error;
    } else {
      console.error(mess, this._startErrorDebug?.stack);
      return error;
    }
  }

  /**
   * @internal
   * Reset the result set and cursor.
   */
  protected _resetResult(): void {
    if (this._result) {
      this._result.length = 0;
    } else {
      this._result = [];
    }
    this._resultCount = 0;
  }

  /**
   * @internal
   * Automatically called from associated IDbProvider to clean up the local properties and variables.
   */
  public __dispose(): void {
    if (this._provider?.dataSource?.showConsoleLogs) {
      console.log(
        `ZeusConnection: Closed ${this._uuid} after ${ZeusUtil.getTimeDiff(this._openedTimestamp, 'seconds')} seconds`,
      );
    }
    this._opened = false;
    this._openedTimestamp = 0;
    this._startErrorDebug = undefined;
    ZeusUtil.freeUuid(this._uuid);
    this._uuid = '';
    this._inTransaction = false;

    // these properties need to remain available
    // this._errorLast = undefined;
    // if (this._result) {
    //   this._result.length = 0;
    // }
    // this._resultCount = 0;
    // this._throwErrors = true;
    // this._insertId = 0;
    // this._affectedRows = 0;
  }

  public toString(verb: string = 'opened for'): string {
    return `ZeusConnection(${this._uuid}) ${verb} ${ZeusUtil.getTimeDiff(this._openedTimestamp, 'seconds')} seconds`;
  }

  // ##################################################################################################################
  // Getters and Setters
  // ##################################################################################################################

  /**
   * Get the underlying library connection reference.
   * (Example the mysql2 Connection object)
   */
  get connection(): ConnectionRef {
    return this._connection;
  }

  /**
   * Set whether to throw errors or return the Error from query/execute methods.
   * If true, errors will be thrown.
   * @param value - boolean
   */
  public set throwErrors(value: boolean) {
    this._throwErrors = value;
  }
  public get throwErrors(): boolean {
    return this._throwErrors;
  }
  public get lastError(): Error | undefined {
    return this._errorLast;
  }
  public get errorLast(): Error | undefined {
    return this._errorLast;
  }
  /** Returns the last insert ID from an execute command or 0 if none. */
  public get insertId(): number {
    return this._insertId;
  }
  /** Returns the number of affected rows from an execute command or 0 if none. */
  public get affectedRows(): number {
    return this._affectedRows;
  }
  public get inTransaction(): boolean {
    return this._inTransaction;
  }
  public get resultCount(): number {
    return this._resultCount;
  }
  public get resultCursor(): number {
    return this._resultCursor;
  }
  public get result(): ResultRow[] {
    return this._result;
  }
  public get uuid(): string {
    return this._uuid;
  }
  public get opened(): boolean {
    return this._opened;
  }
  public get openedTimestamp(): number {
    return this._openedTimestamp;
  }
  public get provider(): IDbProvider {
    return this._provider;
  }
}
