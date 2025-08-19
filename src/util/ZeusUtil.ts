export class ZeusUtil {
  /** @internal
   * Unique tokens for each connection are stored here to prevent duplicates. */
  public static __uuidTokens: Set<string> = new Set<string>();

  /** Purely random UUIDv4 generator.
   * Use generateUuid() to ensure uniqueness within app memory space.
   * @see generateUuid
   * */
  static uuid(): string {
    try {
      return crypto.randomUUID();
    } catch (err) {
      console.warn('crypto.randomUUID() not supported, using fallback', err);
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0,
          v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
  }

  /** Unique UUID generator that checks for duplicates within app memory space.
   * Be sure to free the UUID token by calling freeUuid
   * @see freeUuid */
  static generateUuid(): string {
    const collection: Set<string> = ZeusUtil.__uuidTokens;
    let found: boolean = false;
    let token: string = '';
    while (!found) {
      token = ZeusUtil.uuid();
      if (collection == null || !collection.has(token)) {
        found = true;
      }
    }
    if (collection != null) collection.add(token);
    return token;
  }

  /** Free a UUID token from memory that was previously generated with generateUuid.
   * @see generateUuid */
  static freeUuid(token: string): void {
    const collection: Set<string> = ZeusUtil.__uuidTokens;
    if (collection != null) {
      collection.delete(token);
    }
  }

  static formatDatasourceIdForLookup(id: any, schema?: string): string {
    const strId = String(id);
    if (strId.startsWith('!')) {
      return strId;
    } else if (strId.includes('.')) {
      return strId;
    } else {
      return strId + (schema ? `.${schema}` : '');
    }
  }
  static formatDatasourceId(id: any, schema: string): string {
    const strId = String(id);
    if (strId && strId.length > 0) {
      return strId + (schema ? `.${schema}` : '');
    } else {
      return '!' + ZeusUtil.uuid();
    }
  }

  static getTimestamp(): number {
    return new Date().getTime();
  }

  static now(): string {
    return ZeusUtil.formatDateTime();
  }

  static formatDateTime(date: string = 'now') {
    let input: Date;
    if (date === 'now') {
      input = new Date();
    } else {
      input = new Date(date);
    }
    return (
      '' +
      input.getFullYear() +
      '-' +
      ZeusUtil.pad(input.getMonth() + 1, 2, '0') +
      '-' +
      ZeusUtil.pad(input.getDate(), 2, '0') +
      ' ' +
      ZeusUtil.pad(input.getHours(), 2, '0') +
      ':' +
      ZeusUtil.pad(input.getMinutes(), 2, '0') +
      ':' +
      ZeusUtil.pad(input.getSeconds(), 2, '0')
    );
  }

  static pad(input: any, width: number, padding: string): string {
    padding = padding || '0';
    input = input + '';
    return input.length >= width ? input : new Array(width - input.length + 1).join(padding) + input;
  }

  static getTimeDiff(ts: number, unit: string): number {
    let now: number = ZeusUtil.getTimestamp();
    if (ts == null || now == null || ts <= 0 || now <= 0) return 0;
    let lastDate: number = new Date(ts).getTime();
    let nowDate: number = new Date(now).getTime();

    let diff: number = nowDate - lastDate;

    switch (unit) {
      case 'milliseconds':
      case 'millisecond':
      case 'ms':
        return diff;
      case 'sec':
      case 's':
      case 'second':
      case 'seconds':
        return diff / 1000;
      case 'min':
      case 'm':
      case 'minutes':
      case 'minute':
        return diff / 1000 / 60;
      case 'hour':
      case 'h':
      case 'hours':
        return diff / 1000 / 60 / 60;
      case 'days':
      case 'day':
      case 'd':
        return diff / 1000 / 60 / 60 / 24;
    }

    return 0;
  }

  public static timeStart(): [number, number] {
    return process.hrtime();
  }

  public static timeEnd(start: [number, number]): string {
    return (process.hrtime(start)[1] / 1000000000).toFixed(5);
  }

  public static isPlainObject(o: any): boolean {
    let ctor, prot;

    if (!ZeusUtil._isObjectObject(o)) return false;

    // If has modified constructor
    ctor = o.constructor;
    if (typeof ctor !== 'function') return false;

    // If has modified prototype
    prot = ctor.prototype;
    if (!ZeusUtil._isObjectObject(prot)) return false;

    // If constructor does not have an Object-specific method
    if (!prot.hasOwnProperty('isPrototypeOf')) {
      return false;
    }

    // Most likely a plain Object
    return true;
  }

  public static isObject(val: any): boolean {
    return val != null && typeof val === 'object' && Array.isArray(val) === false;
  }

  public static isNumeric(n: any): boolean {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }

  private static _isObjectObject(o: any) {
    return ZeusUtil.isObject(o) && Object.prototype.toString.call(o) === '[object Object]';
  }

  public static connectionStringToObject(connectionString: string): any {
    const url = new URL(connectionString);
    return {
      // protocol: url.protocol.substr(0, url.protocol.length - 1), // Remove trailing ':'
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      host: decodeURIComponent(url.hostname),
      port: parseInt(url.port, 10),
      database: decodeURIComponent(url.pathname.substring(1)), // Remove leading '/'
    };
  }

  public static formatTemplateQuery(arg1: TemplateStringsArray, ...rest: any[]): [string, any[]] {
    const strings: TemplateStringsArray = arg1 as TemplateStringsArray;
    const values: any[] = rest;

    let sql = '';
    const params: any[] = [];

    for (let i = 0; i < strings.length; i++) {
      sql += strings[i];
      if (i < values.length) {
        sql += '?';
        params.push(values[i]);
      }
    }

    return [sql, params];
  }

  public static formatTemplateString(arg1: TemplateStringsArray, ...rest: any[]): string {
    const strings: TemplateStringsArray = arg1 as TemplateStringsArray;
    const values: any[] = rest;

    let sql = '';

    for (let i = 0; i < strings.length; i++) {
      sql += strings[i];
      if (i < values.length) {
        sql += values[i];
      }
    }

    return sql;
  }

  /**
   * Splits a string of SQL commands into individual statements.
   * @param sqlCommands - The string containing SQL commands.
   */
  public static splitSqlStatements(sqlCommands: string): string[] {
    const statements: string[] = [];
    let current = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inDollarBlock = false;
    let dollarTag = '';
    let blockDepth = 0;
    let escapeNext = false;

    const matchDollarStart = (s: string, i: number): string | null => {
      const match = s.slice(i).match(/^\$[a-zA-Z_0-9]*\$/);
      return match ? match[0] : null;
    };

    for (let i = 0; i < sqlCommands.length; i++) {
      const char = sqlCommands[i];
      const nextChunk = sqlCommands.slice(i);

      // Dollar-quoted block
      if (!inSingleQuote && !inDoubleQuote && !inDollarBlock) {
        const tag = matchDollarStart(sqlCommands, i);
        if (tag) {
          inDollarBlock = true;
          dollarTag = tag;
          current += tag;
          i += tag.length - 1;
          continue;
        }
      } else if (inDollarBlock) {
        if (nextChunk.startsWith(dollarTag)) {
          inDollarBlock = false;
          current += dollarTag;
          i += dollarTag.length - 1;
          continue;
        } else {
          current += char;
          continue;
        }
      }

      if (escapeNext) {
        current += char;
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        current += char;
        continue;
      }

      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
        current += char;
        continue;
      }

      if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
        current += char;
        continue;
      }

      // BEGIN...END block tracking
      if (!inSingleQuote && !inDoubleQuote && !inDollarBlock) {
        if (nextChunk.match(/^BEGIN\b/i)) {
          blockDepth++;
        } else if (nextChunk.match(/^END\b/i)) {
          if (blockDepth > 0) blockDepth--;
        }
      }

      if (char === ';' && !inSingleQuote && !inDoubleQuote && !inDollarBlock && blockDepth === 0) {
        const cleaned = current
          .split('\n')
          .filter((line) => !line.trim().startsWith('--'))
          .join('\n')
          .trim();

        if (cleaned.length > 0) {
          statements.push(cleaned);
        }

        current = '';
      } else {
        current += char;
      }
    }

    // Handle final statement (no trailing semicolon)
    const final = current
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')
      .trim();

    if (final.length > 0) {
      statements.push(final);
    }

    return statements;
  }
}
