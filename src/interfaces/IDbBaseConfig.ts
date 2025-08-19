

export interface IDbBaseConfig {

  /**
   * Load a connection string from a `.env` file based on the value as the key. (Default: undefined)
   * Example:
   * ```
   * envKey: 'JAWSDB_URL'
   * ```
   */
  envKey?: string | undefined;


  /**
   * The DatabaseService user to authenticate as
   */
  user?: string | undefined;

  /**
   * The password of that DatabaseService user
   */
  password?: string | undefined;

  /**
   * Name of the database to use for this connection
   */
  database?: string | undefined;

  /**
   * The hostname of the database you are connecting to. (Default: localhost)
   */
  host?: string | undefined;

  /**
   * The port number to connect to. (Default: will be the default port for the database service, such as 3306 for MySQL)
   */
  port?: number | undefined;

}