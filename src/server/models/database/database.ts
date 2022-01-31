import { MysqlError } from "mysql";

export class DBResult {
  public data: Record<string, any>[];
  public meta: DBMeta;
  public error: MysqlError;

  constructor(results: Record<string, any>[], meta: DBMeta, error: MysqlError) {
    this.data = results;
    this.meta = meta;
    this.error = error;
  }
}

export class DBMeta {
  public affectedRows: number;
  public insertId: number;
  public changedRows: number;

  constructor(affectedRows: number, insertId: number, changedRows: number) {
    this.affectedRows = affectedRows;
    this.insertId = insertId;
    this.changedRows = changedRows;
  } 
}