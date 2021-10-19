import config from "../config";
import mysql2 from "mysql2/promise";
import { connect } from "http2";

export const load = async (): Promise<mysql2.PoolConnection> => {
  const db = await mysql2.createPool({
    host: config.dbURL,
    port: 3306,
    user: config.dbUser,
    password: config.dbPassword,
    database: config.dbName,
  });

  const connection = await db.getConnection();
  connection.query("use highlightme_aurora");

  return connection;
};
