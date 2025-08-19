import { CliCommonBase, ICliCommandProfileBase } from '../CliCommonBase';
import { CliGenerateInterface } from './CliGenerateInterface';

export interface ICliCommandProfileGenerate extends ICliCommandProfileBase {
  method: string,
  output?: string,
  interfacePrefix?: string,
  enumPrefix?: string,
  showFieldComments?: boolean
}

/**
 * CLI: `npx zeusdb generate {configProfile?=default}`
 * Purpose: Generate local typescript interface typings for the database schema
 *
 * Parameters:
 *  - configProfile - the configuration profile to use for generating the interface file,
 *      under the 'generate' key in the zeusdb.json file. Will default to the "default" profile.
 */
export default async function generate () {

  const {args, command, workingDir, config, commandProfiles} = await CliCommonBase.init();

  if (!commandProfiles || commandProfiles.length === 0) {
    console.error(`Cli.Generate: No command profiles found for command ${command}...`);
    process.exit(1);
  }

  const generateCommandProfiles:ICliCommandProfileGenerate[] = commandProfiles as ICliCommandProfileGenerate[];
  for (const commandProfile of generateCommandProfiles) {
    switch (commandProfile.method) {
      case "interface_single_file":
      default:

        const generator = new CliGenerateInterface();
        generator.args = args;
        generator.workingDir = workingDir;
        generator.config = config;
        generator.commandProfile = commandProfile;
        await generator.generateSingleFileInterface();

        break;
    }
  }

}