![Zeus DB](zeus.png)

Zeus DB
========
Custom database wrapper


**Table of Contents:**
<!-- toc -->
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Configuration](#configuration)
  * [Section `datasources`](#section-datasources)
  * [Section `generate`](#section-generate)
- [Advanced Usage](#advanced-usage)
  * [Querying](#querying)
  * [Executing](#executing)
  * [Transactions](#transactions)
- [Development](#development)
    + [Testing](#testing)
- [Attributions](#attributions)
<!-- tocstop -->


## Installation

Install the private package from the GitHub repository.

```shell
npm install zeusdb
```

Initialize the config folder with the following command:

```shell
npx zeusdb init
```
This will create a config file `zeusdb/zeusdb.json` in the root of your project.
Edit this file to include the data sources you want to use.

Once you have the configuration setup properly (see the [Configuration](#configuration) section below), you will then want to generate the TypeScript types for your database tables. This can be done with the following command:
```shell
npx zeusdb generate db1
```
Where `db1` is the name of the `generate config profile` found within the `zeusdb/zeusdb.json`. Leave the profile name blank to generate the default profile (if configured).

## Basic Usage

Create a new library file in a path like `lib/zeusdb.ts` and add the following code for each desired data source:
```typescript
import { ZeusDB } from 'zeusdb';
export const db1 = ZeusDB.getDataSource('db1');
export const mls = ZeusDB.getDataSource('db2');
```
Then you may access the database directly anywhere in the code base, such as:
```typescript
import { db1 } from './lib/zeusdb';
import { type ResultRow } from 'zeusdb';

const convoId = 1;
const results:ResultRow[]|Error = await db1.query`
        SELECT * FROM Message where conversationId = ${convoId}`;
```

See the [Advanced Usage](#advanced-usage) section below for more usage examples.

## Configuration

The configuration file `zeusdb/zeusdb.json` is broken up into main sections, `generate`,  `datasources`, etc.

See the `interfaces/IDbConfig.ts` file for the full list of configuration options.

Example config, to quickly see the options:
```json
{
  "datasources": {
    "db1": {
      "id": "db1",
      "usePool": true,
      "poolTimeout": 5000,
      "showConsoleLogs": true,
      "batchExecuteAlwaysSplit": true,
      "throwErrors": true,
      "mysql": {
        "envKey": "JAWSDB_URL",
        "connectionLimit": 10
      }
    }
  },
  "generate": {
    "default": "db1",
    "db1": {
      "datasource": "db1",
      "method": "interface_single_file",
      "output": "src/types/dbTypes.ts",
      "interfacePrefix": "db1",
      "enumPrefix": "db1",
      "showFieldComments": true
    }
  }
}
```

### Section `datasources` 
This section is an object with keys that represent the name of the data source. Each data source object should contain the following properties:

- `id` - The name of the data source, should match the key.
- `usePool` - boolean - Whether to use a connection pool for this data source.
- `poolTimeout` - number - The time in milliseconds to wait for a connection from the pool before throwing an error.
- `showConsoleLogs` - boolean - Whether to show console logs for this data source.
- `batchExecuteAlwaysSplit` - boolean - Whether to always split batch execute statements into individual queries.
- `throwErrors` - boolean - If set to false, then the query, queryRow, queryScalar, execute, and executeBatch methods will not throw errors, but instead return an error object or the result object.
- `mysql` - Used to configure mysql specific properties.

  - `envKey` - loads the connection string from the `.env` file, set the key to be `"JAWSDB_URL"` for example,
  - `connectionLimit` - number - The maximum number of connections to create for the pool.
  - ... see the `interfaces/IMysqlConfig.ts` file for the full list.


### Section `generate`
This section is an object with keys that represent the name of the generate profile. Each profile object should contain the following properties:

- `datasource` - string - The name of the data source to generate types for.
- `method` - string - The method to use for generating the types. Options are `interface_single_file`
- `output` - string - The output file or folder for the generated types.
- `interfacePrefix` - string - The prefix to use for the generated interfaces.
- `enumPrefix` - string - The prefix to use for the generated enums.
- `showFieldComments` - boolean - Whether to include comments for each field in the generated types.

Note: you can make an entry called `default` and its value used if no datasource is specified in the generate command. 

## Advanced Usage

The ZeusDB library provides a number of methods for interacting with the database.

### Querying
Querying is used to fetch data. You have three ways of fetching data:

1. Rows - ResultRow[]|Error - an array of rows.
2. Row - ResultRow|Error - the first row.
3. Scalar - any|Error - the value of the first row's first column.

```typescript
const rows = await db1.query`
        SELECT * FROM Message where conversationId = ${convoId}`;

const row = await db1.queryRow`
        SELECT * FROM Message where id = ${id}`;

const title = await db1.queryScalar`
        SELECT title FROM Message where id = ${id}`;
```
Alternative syntax:
```typescript
const rows = await db1.query(`
        SELECT * FROM Message where conversationId = ?`, [convoId]);

const row = await db1.queryRow(`
        SELECT * FROM Message where id = ?`, [id]);

const title = await db1.queryScalar(`
        SELECT title FROM Message where id = ?`, [id]);
```

Both syntax examples pass the SQL and values as separate parameters to the database to prevent SQL injection.

### Typed Results

If you generated the types for your database (`npx zeusdb generate`), then you can use the interfaces to type the results, useful for auto-completion and type checking.

For example, if you have a table called `Message`, you can use the generated `db1Message` interface to get typed results.

If you have throwErrors set to false:
```typescript
const messages:db1Message[]|Error = await db1.query`SELECT * 
          FROM Message where conversationId = ${convoId}`;
if (messages instanceof Error) {
  // handle error
}
for (const message of messages) {
  console.log(message.title);
}
```
If you have throwErrors enabled:
```typescript
try {
  const messages = (await db1.query`
          SELECT * FROM Message where conversationId = ${convoId}`) as db1Message[];
  //...
} catch (err) {
  // handle error
}
```

### Executing

Executing queries are useful for manipulating data (INSERT, UPDATE, DELETE, etc). You have two ways of executing queries:
```typescript
const result = await db1.execute`
        INSERT INTO Message (title, body) VALUES (${title}, ${body})`;
```
Alternative syntax:
```typescript
const result = await db1.execute(`
        INSERT INTO Message (title, body) VALUES (?, ?)`, [title, body]);
```
The result object contains the following properties:
- `affectedRows` - number - The number of rows affected by the query.
- `insertId` - number - The ID of the last inserted row, if applicable.

You can also use the `executeBatch` method to execute multiple queries in a single call. This method returns an array of result objects.

```typescript
const results = await db1.executeBatch`
  INSERT INTO Message (title, body) VALUES (${title1}, ${body1});
  INSERT INTO Message (title, body) VALUES (${title2}, ${body2});
`;
```


### Transactions

Transactions are used to group multiple queries together, so they all succeed or they all fail. You can use the `begin` method to get a connection in transaction mode. Any `execute` or `query` calls will be part of the transaction until you call `commit` or `rollback`.
Do not forget to also release the connection when you are done with the transaction by calling `await conn.end();`.

Full example:
```typescript
const conn = await db1.begin();
conn.throwErrors = true;
try {
  await conn.execute`INSERT INTO Message (title) VALUES (${title}})`;
  await conn.execute`UPDATE Message SET body = ${body} WHERE id = ${id}`;
  await conn.query`SELECT * FROM Message WHERE id = ${id}`;
  await conn.commit();
} catch (err) {
  await conn.rollback();
}
await conn.end();
```

See the auto-generated `docs` folder for more information on the ZeusDB library.



## Development

To develop ZeusDB locally you may want the repo connected using the filesystem instead of git.

Uninstall the git version of ZeusDB, if it is installed:
```shell
npm uninstall zeusdb
```
Clone the ZeusDB repository to your local machine in the parent directory outside your project directory.
Then install the local version of ZeusDB using the following command:
```shell
npm install ../zeusdb
```
Remember not to commit the changes to the package.json file.

#### Testing
Unit tests using `jest` have been setup to test the library. To run the tests, use the following command:
```shell
npm test
```
Please add your own unit tests if you add new features.





## Attributions

Zeus is named after Benjamin's dog.
