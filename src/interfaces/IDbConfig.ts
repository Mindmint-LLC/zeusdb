import { type IMysqlConfig } from './IMysqlConfig';

export interface IDbConfig {
  /** Unique identifier for the database connection (defaults to uuidv4) */
  id?: string | number;

  /** The name of databases to be used within this connection.
   * (Optional) Only needed if the connection string for the database provider does not contain the database.
   * Do not use if the connection string contains the database name.
   */
  schemas?: string[];

  /** Enables the use of a connection pool. Recommended. (default true) */
  usePool?: boolean;

  /** Timeout in ms for fetching a pool connection (default 30000 ms) */
  poolTimeout?: number;

  /** If true, will show console logs for queries and other operations. (default false) */
  showConsoleLogs?: boolean;

  /** If true, batch execute will always split the queries into single queries. (default true)
   * If set to false, then will try to use multipleStatement SQL execution if possible. */
  batchExecuteAlwaysSplit?: boolean;

  /** If set to false, errors will be returned as part of the result set, instead of needing to be caught. (default true) */
  throwErrors?: boolean;

  // #############################################################################################################################
  // region DATABASE PROVIDER CONFIGURATION

  mysql?: IMysqlConfig;
  postgres?: any; // TODO add postgres support

  // endregion
}
