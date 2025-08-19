import { IDbConfig } from '../interfaces/IDbConfig';
import { DataSourceIdentifier } from '../types/ZeusTypes';
import { ZeusConnection } from './ZeusConnection';
import { ZeusDataSource } from './ZeusDataSource';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ZeusUtil } from '../util/ZeusUtil';

export class ZeusDB {
  protected static _dataSources: Map<string, ZeusDataSource> = new Map();

  constructor() {}


  /**
   * Initialize the ZeusDB library. This method should be called once at the start of the application.
   * This will load the data sources defined in the `zeusdb/zeusdb.json` configuration file.
   */
  public static init(): void {
    // use fs to load the configuration file from the project root
    const projectRootPath = process.cwd();
    const zeusdbPath = path.join(projectRootPath, 'zeusdb', 'zeusdb.json');
    if (!fs.existsSync(zeusdbPath)) {
      throw new Error('ZeusDB.init: Configuration file not found');
    }
    let config;
    try {
      config = JSON.parse(fs.readFileSync(path.join(projectRootPath, 'zeusdb', 'zeusdb.json'), 'utf8'));
    } catch (e) {
      throw new Error('ZeusDB.init: Error parsing configuration file');
    }
    if (!config || !config.datasources) {
      throw new Error('ZeusDB.init: Configuration file is empty or invalid');
    }
    // parse the JSON and register the data sources
    for (const [_key, dataSource] of Object.entries(config.datasources)) {
      const ds:IDbConfig = dataSource as IDbConfig;
      if (ds.schemas && ds.schemas.length > 0) {
        for (const schema of ds.schemas) {
          const result:ZeusDataSource = this.registerDataSource(ds, schema);
          if (!result || !result.schema) {
            throw new Error(`ZeusDB.init: Data source ${ds.id} does not have a schema defined`);
          }
        }
      } else {
        // hopefully the datasource has a schema...
        const result:ZeusDataSource = this.registerDataSource(ds);
        if (!result || !result.schema) {
          throw new Error(`ZeusDB.init: Data source ${ds.id} does not have a schema defined`);
        }
      }
    }
  }


  /**
   * Register a new data source. Required to be called before using the data source.
   * The data source is identified by the "id" property in the config, if the id is not provided,
   *  a UUID will be generated.
   *
   * Each data source can have its own configuration, including database provider, connection details,
   *  and pooling options.
   *
   * @param config - IDbConfig - The configuration for the data source.
   * @param schema - string - optional schema name to use for the data source (appended .../{schema}).
   * @return ZeusDataSource - The registered data source.
   */
  public static registerDataSource(config: IDbConfig, schema:string=''): ZeusDataSource {
    const dataSource = new ZeusDataSource(config, schema);
    if (this._dataSources.has(dataSource.id)) {
      const previousDataSource = this._dataSources.get(dataSource.id);
      if (previousDataSource) {
        return previousDataSource;
      }
    }
    this._dataSources.set(dataSource.id, dataSource);
    return dataSource;
  }

  /**
   * Get a registered data source by identifier provided in the config when registering.
   *
   * @param identifier - string or number matching the "dataSource.id" property.
   * @param schema - optional schema name to use for the data source (appended .../{schema}).
   * @param _internalCounter - Internal use only.
   * @returns ZeusDataSource
   */
  public static getDataSource(identifier: DataSourceIdentifier, schema?:string, _internalCounter:number=0): ZeusDataSource {
    let source = this._dataSources.get(identifier);
    if (source && source.schema == schema) {
        return source;
    }
    source = this._dataSources.get(ZeusUtil.formatDatasourceIdForLookup(identifier, schema));
    if (source) {
      return source;
    }
    // try one more time after initializing the library
    if (_internalCounter > 0) {
      throw new Error('ZeusDB.getDataSource: Data source not found: ' + identifier + ' with schema: ' + schema);
    }
    ZeusDB.init();
    return this.getDataSource(identifier, schema, _internalCounter + 1);
  }

  /**
   * Start a new connection to the data source. If the data source uses pooling, a pooled connection will
   *  be returned if one is available.
   * Be sure to always call `connection.close()` when finished with the connection to release it back to the pool.
   *
   * Only one transaction can be active per connection at a time.
   *
   * You may also use the `ZeusDataSource.connect()` method directly to start a connection.
   * @see ZeusDataSource.connect
   *
   * @param identifier - string or number matching the "dataSource.id" property.
   * @param schema - optional schema name to use for the data source (appended .../{schema}).
   * @returns ZeusConnection
   */
  public static async connect(identifier: DataSourceIdentifier, schema?:string): Promise<ZeusConnection> {
    const conf = this.getDataSource(identifier, schema);
    return conf!.connect();
  }

  /**
   * Disconnect all connections for a given data source, including pooled connections.
   *
   * @param identifier - string or number matching the "dataSource.id" property.
   * @returns void
   */
  public static async disconnectAll(identifier?: DataSourceIdentifier): Promise<void> {
    const promises = [];
    if (identifier) {
      const conf = this.getDataSource(identifier);
      promises.push(conf.disconnectAll());
    } else {
      this._dataSources.forEach((conf) => {
        promises.push(conf.disconnectAll());
      });
    }
    await Promise.all(promises);
  }
}
