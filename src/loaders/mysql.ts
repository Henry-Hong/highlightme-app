import config from "../config";
import mysql2 from "mysql2/promise";

export const load = async (): Promise<mysql2.Connection> => {
  const db = await mysql2.createConnection({
    host: config.dbURL,
    port: 3306,
    user: config.dbUser,
    password: config.dbPassword,
    database: config.dbName,
  });

  await db.connect();
  await db.query("use highlightme_aurora");

  return db;
};
