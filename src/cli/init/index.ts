import { CliCommonBase, ZEUSDB_FOLDER } from '../CliCommonBase';

export default async function () {

  // Initialize the CLI command
  // Internally this setups the directory and a default `zeusdb.json` configuration file if missing
  await CliCommonBase.init(false);
  console.log(`ZeusDB has been initialized. Please configure your ${ZEUSDB_FOLDER} directory.`);

}