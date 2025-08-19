import type { TypeCast } from "mysql2";
import { IDbBaseConfig } from './IDbBaseConfig';

export interface IMysqlConfig extends IDbBaseConfig {


  // #############################################################################################################################

  // region EXPANDED OPTIONS

  /**
   * DECIMAL and NEWDECIMAL types will be returned as numbers if this option is set to `true` ( default: `false`).
   */
  decimalNumbers?: boolean;

  /**
   * The charset for the connection. This is called "collation" in the SQL-level of MySQL (like utf8_general_ci).
   * If a SQL-level charset is specified (like utf8mb4) then the default collation for that charset is used.
   * (Default: 'UTF8_GENERAL_CI')
   */
  charset?: string | undefined;

  /**
   * Number of milliseconds
   */
  timeout?: number | undefined;

  /**
   * The source IP address to use for TCP connection
   */
  localAddress?: string | undefined;

  /**
   * The path to a unix domain socket to connect to. When used host and port are ignored
   */
  socketPath?: string | undefined;

  /**
   * The timezone used to store local dates. (Default: 'local')
   */
  timezone?: string | undefined;

  /**
   * The milliseconds before a timeout occurs during the initial connection to the MySQL server. (Default: 10 seconds)
   */
  connectTimeout?: number | undefined;

  /**
   * Stringify objects instead of converting to values. (Default: 'false')
   */
  stringifyObjects?: boolean | undefined;

  /**
   * Allow connecting to MySQL instances that ask for the old (insecure) authentication method. (Default: false)
   */
  insecureAuth?: boolean | undefined;

  /**
   * Determines if column values should be converted to native JavaScript types. It is not recommended (and may go away / change in the future)
   * to disable type casting, but you can currently do so on either the connection or query level. (Default: true)
   *
   * You can also specify a function (field: any, next: () => void) => {} to do the type casting yourself.
   *
   * WARNING: YOU MUST INVOKE the parser using one of these three field functions in your custom typeCast callback. They can only be called once.
   *
   * field.string()
   * field.buffer()
   * field.geometry()
   *
   * are aliases for
   *
   * parser.parseLengthCodedString()
   * parser.parseLengthCodedBuffer()
   * parser.parseGeometryValue()
   *
   * You can find which field function you need to use by looking at: RowDataPacket.prototype._typeCast
   */

  typeCast?: TypeCast | undefined;
  /**
   * When dealing with big numbers (BIGINT and DECIMAL columns) in the database, you should enable this option
   * (Default: false)
   */
  supportBigNumbers?: boolean | undefined;

  /**
   * Enabling both supportBigNumbers and bigNumberStrings forces big numbers (BIGINT and DECIMAL columns) to be
   * always returned as JavaScript String objects (Default: false). Enabling supportBigNumbers but leaving
   * bigNumberStrings disabled will return big numbers as String objects only when they cannot be accurately
   * represented with [JavaScript Number objects] (http://ecma262-5.com/ELS5_HTML.htm#Section_8.5)
   * (which happens when they exceed the [-2^53, +2^53] range), otherwise they will be returned as Number objects.
   * This option is ignored if supportBigNumbers is disabled.
   */
  bigNumberStrings?: boolean | undefined;
  /**
   * Force date types (TIMESTAMP, DATETIME, DATE) to be returned as strings rather then inflated into JavaScript
   * Date objects. Can be true/false or an array of type names to keep as strings. (Default: false)
   */
  dateStrings?: boolean | Array<"TIMESTAMP" | "DATETIME" | "DATE"> | undefined;
  /**
   * This will print all incoming and outgoing packets on stdout.
   * You can also restrict debugging to packet types by passing an array of types (strings) to debug;
   *
   * (Default: false)
   */
  debug?: any;
  /**
   * Generates stack traces on errors to include call site of library entrance ("long stack traces"). Slight
   * performance penalty for most calls. (Default: true)
   */
  trace?: boolean | undefined;
  /**
   * Allow multiple mysql statements per query. Be careful with this, it exposes you to SQL injection attacks. (Default: false)
   */
  multipleStatements?: boolean | undefined;
  /**
   * List of connection flags to use other than the default ones. It is also possible to blacklist default ones
   */
  flags?: Array<string>;
  /**
   * object with ssl parameters or a string containing name of ssl profile
   */
  ssl?: string | any | undefined;
  /**
   * The milliseconds before a timeout occurs during the connection acquisition. This is slightly different from connectTimeout,
   * because acquiring a pool connection does not always involve making a connection. (Default: 10 seconds)
   */
  acquireTimeout?: number | undefined;

  /**
   * A custom query format function
   */
  queryFormat?(query: string, values: any): string;

  /**
   * Return each row as an array, not as an object.
   * This is useful when you have duplicate column names.
   * This can also be set in the `QueryOption` object to be applied per-query.
   */
  rowsAsArray?: boolean;

  /**
   * Enable keep-alive on the socket. (Default: true)
   */
  enableKeepAlive?: boolean;

  /**
   * If keep-alive is enabled users can supply an initial delay. (Default: 0)
   */
  keepAliveInitialDelay?: number;

  charsetNumber?: number;

  compress?: boolean;

  // endregion EXPANDED OPTIONS

  // #############################################################################################################################
  // #############################################################################################################################
  // #############################################################################################################################
  // #############################################################################################################################

  // region POOL OPTIONS
  /**
   * Determines the pool's action when no connections are available and the limit has been reached. If true, the pool will queue
   * the connection request and call it when one becomes available. If false, the pool will immediately call back with an error.
   * (Default: true)
   */
  waitForConnections?: boolean | undefined;
  /**
   * The maximum number of connections to create at once. (Default: 10)
   */
  connectionLimit?: number | undefined;
  /**
   * The maximum number of connection requests the pool will queue before returning an error from getConnection. If set to 0, there
   * is no limit to the number of queued connection requests. (Default: 0)
   */
  queueLimit?: number | undefined;

  // endregion POOL OPTIONS

  // #############################################################################################################################
}
