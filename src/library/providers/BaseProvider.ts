import { ZeusUtil } from '../../util/ZeusUtil';
import { IDbBaseConfig } from '../../interfaces/IDbBaseConfig';
import 'dotenv/config';

export class BaseProvider {

  public name:string = 'base';

  protected _formatConfig(config: IDbBaseConfig, schema:string=''): IDbBaseConfig {
    if (!config) {
      throw new Error(`Zeus.${this.name}Provider: Missing '${this.name}' configuration`);
    }

    // Convert envKey connection string to user/password/host/etc keys.
    if (config.envKey) {
      const connectionString = process.env[config.envKey];
      if (!connectionString) {
        throw new Error(`Zeus.${this.name}Provider: Missing connection string environment variable for key '${config.envKey}'`);
      }
      const connectionObj = ZeusUtil.connectionStringToObject(connectionString);
      config = Object.assign(config, connectionObj);

      // remove the envKey
      config.envKey = undefined;
      delete config.envKey;
    }

    // If a schema is provided, set the database to the schema
    if (schema && !config.database) {
      config.database = schema;
    }

    return config;
  }

}