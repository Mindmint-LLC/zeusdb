import fs from 'node:fs';
import path from 'node:path';
import DEFAULT_CONFIG from './zeusdb.default.json';

export const ZEUSDB_FOLDER = 'zeusdb';

export interface ICliCommandProfileBase {
  datasource?: string;
  schema?: string;
}

export interface ICliInitResponse {
  args: string[];
  command: string;
  workingDir: string;
  config?: any; //JSON
  commandProfiles?: Array<ICliCommandProfileBase>; //JSON
}

export abstract class CliCommonBase {

  public args: string[] = [];
  public workingDir: string = "";

  public config: any = {};
  public commandProfile: ICliCommandProfileBase = {};


  constructor() {
  }


  /**
   * Initialize the CLI command. This method should be called once at the start of the command.
   * This will load the configuration from the `zeusdb/zeusdb.json` file.
   */
  public static async init(loadConfig:boolean = true):Promise<ICliInitResponse> {

    process.removeAllListeners('warning');

    // remove the first three arguments from the process arguments (node, zeusdb and the command)
    const args = process.argv.slice(3);
    const workingDir = this._initializeDirectory();
    const command = process.argv[2];


    const payloadResponse:ICliInitResponse = {
      args,
      command,
      workingDir
    };

    if (loadConfig) {
      const config = await this.loadZeusDbConfig(workingDir);
      payloadResponse.config = config;

      if (config && config[command]) {
        const commandProfiles: any[] = [];
        payloadResponse.commandProfiles = commandProfiles;

        let configProfileKey = args[0] || 'default';

        // if the key is default and config.generate.default does not exist, then loop through all datasources
        if (configProfileKey === 'default' && !config[command].default) {
          // loop through all the keys in the config.generate object

          for (const key in config[command]) {
            if (key !== 'default') {
              const configProfile = config[command][key];
              if (configProfile) {
                commandProfiles.push(configProfile);
              }
            }
          }

        } else {
          // if default is the key and config.generate.default exists, then use that one datasource
          // single datasource command:
          if (configProfileKey === 'default') {
            configProfileKey = config[command].default;
          }
          const configProfile = config[command][configProfileKey];

          if (configProfile) {
            commandProfiles.push(configProfile);
          }
        }


        if (commandProfiles.length == 0) {
          throw new Error(`Cli.${command}: No configuration profile found for key ${configProfileKey}...`);
        }
      }
    }

    return payloadResponse;


  }


  protected static _initializeDirectory():string {
    console.log("Initializing directory");

    const workingDir = process.cwd();
    // make sure the working directory is the base of a project

    // check if the package.json file exists
    if (!fs.existsSync(path.join(workingDir, 'package.json'))) {
      throw new Error("Need to run this command in the root of a project");
    }

    // check if zeusdb is in the package.json file as a dependency
    const packageJson = JSON.parse(fs.readFileSync(path.join(workingDir, 'package.json'), 'utf-8'));
    if ((!packageJson || typeof packageJson !== 'object' || !packageJson.dependencies || !packageJson.dependencies.zeusdb) &&
      ((process.env['ENVIRONMENT'] ?? '') != 'dev')) {
      throw new Error("Need to have zeusdb installed in your project. Use `npm install github:Mindmint-LLC/zeusdb`");
    }

    // if it does, check if the zeusdb folder exists, if not, create it
    try {
      if (!fs.existsSync(path.join(workingDir, ZEUSDB_FOLDER))) {
        fs.mkdirSync(path.join(workingDir, ZEUSDB_FOLDER));
      }
    } catch (e) {
      throw new Error(`Failed to create '${ZEUSDB_FOLDER}' folder - ${e}`);
    }

    // if it does, check if the zeusdb.json file exists, if not, create it
    try {
      if (!fs.existsSync(path.join(workingDir, ZEUSDB_FOLDER, 'zeusdb.json'))) {

        fs.writeFileSync(path.join(workingDir, ZEUSDB_FOLDER, 'zeusdb.json'),
          JSON.stringify(DEFAULT_CONFIG, null, 2));
      }
    } catch (e) {
      throw new Error(`Failed to create 'zeusdb.json' file - ${e}`);
    }

    // if it does, check if the zeusdb.json file is valid, if not, throw an error
    const zeusdbJson = JSON.parse(fs.readFileSync(path.join(workingDir, ZEUSDB_FOLDER, 'zeusdb.json'), 'utf-8'));
    // TODO validate zeusdb.json    // TODO validate zeusdb.json
    if (!zeusdbJson || typeof zeusdbJson !== 'object') {
      throw new Error("zeusdb.json is not valid");
    }

    return workingDir;

  }

  public static async loadZeusDbConfig(workingDir:string): Promise<any> {
    return JSON.parse(fs.readFileSync(path.join(workingDir, ZEUSDB_FOLDER, 'zeusdb.json'), 'utf-8'));
  }


}