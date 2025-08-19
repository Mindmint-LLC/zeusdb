import { CliCommonBase } from '../CliCommonBase';

export abstract class CliGenerateBase extends CliCommonBase {

  constructor() {
    super()
  }


  public getFieldTypeFromColumnType(columnType: string): string {
    switch (columnType) {
      case 'int':
      case 'tinyint':
      case 'smallint':
      case 'mediumint':
      case 'bigint':
      case 'decimal':
      case 'float':
      case 'double':
      case 'real':
      case 'bit':
        return 'number';
      case 'date':
      case 'datetime':
      case 'timestamp':
      case 'time':
      case 'year':
        return 'Date';
      case 'char':
      case 'varchar':
      case 'text':
      case 'tinytext':
      case 'mediumtext':
      case 'longtext':
        return 'string';
      case 'blob':
      case 'tinyblob':
      case 'mediumblob':
      case 'longblob':
        return 'Buffer';
      case 'binary':
      case 'varbinary':
        return 'Uint8Array';
      case 'enum':
        return 'string';
      case 'set':
        return 'string[]';
      case 'json':
      case 'jsonb':
        return 'any';
      case 'geometry':
      case 'point':
      case 'linestring':
      case 'polygon':
      case 'multipoint':
      case 'multilinestring':
      case 'multipolygon':
      case 'geometrycollection':
        return 'string';
      case 'boolean':
        return 'boolean';
      default:
        return 'any';
    }
  }

}