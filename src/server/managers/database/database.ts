import { createPool, MysqlError, PoolConnection } from "mysql";
import { DBResult, DBMeta } from "../../models/database/database"
import { Delay } from "../../utils"
import DBConfig from "../../../configs/database.json"

const pool = createPool(DBConfig);

/**
 * Database query formatter
 */
 pool.on("connection", (connection: PoolConnection): void => {
  connection.config.queryFormat = function (query: string, values: Record<string, any>): string {
    if (!values) return query;
    return query.replace(new RegExp(/\:(\w+)/g), function (txt: any, key: string | number): string {
      if (new Object(values).hasOwnProperty(key)) {
        return this.escape(values[key]);
      }
      return txt;
    }.bind(this));
  };
});

export async function isConnected(): Promise<[boolean, any]> {
  let dbConnected = false;
  let errorState;
  let finished = false;

  pool.getConnection(function(err) {
    if (!err) {
      dbConnected = true;
    } else {
      errorState = err;
      dbConnected = false;
    }

    finished = true;
  });


  while (!finished) {
    await Delay(0);
  }

  return [dbConnected, errorState];
}

/**
 * 
 * @param query mysql query string
 * @param data an object of values that the query string will embed into the query
 * @returns a 'DBResult' class object
 */
export async function SendQuery(query: string, data: Record<string, any>): Promise<DBResult> {
  return new Promise((resolve) => {
    pool.getConnection((error: MysqlError, connection: PoolConnection): void => {
      if (!error) {
        connection.query(query, data, (error: MysqlError, data): void => {
          if (!error) {
  
            let returned_data: DBResult;
            if (query.includes("SELECT")) {
              returned_data = new DBResult(data, new DBMeta(0, 0, 0), null);
            } else if (query.includes("DELETE") || query.includes("UPDATE") || query.includes("INSERT")) {
              returned_data = new DBResult([], new DBMeta(data.affectedRows, data.insertId, data.changedRows), null);
            } else {
              returned_data = new DBResult([], new DBMeta(0, 0, 0), null);
            }
    
            resolve(returned_data);
          } else {
            resolve(new DBResult([], new DBMeta(0, 0, 0), error));
          }
        })
      } else {
        resolve(new DBResult([], new DBMeta(0, 0, 0), error));
      }
      
      connection.release();
    })
  })
}
