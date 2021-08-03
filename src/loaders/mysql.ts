import config from "../config";
import mysql from "mysql";

export default async (): Promise<mysql.Connection> => {
  const db = await mysql.createConnection({
    host: config.dbURL,
    port: config.dbPort,
    user: config.dbUser,
    password: config.dbPassword,
    database: config.dbName,
  });
  return db;
};

// export default async (): Promise<Db> => {
//   const connection = await mongoose.connect(config.databaseURL, {
//     useNewUrlParser: true,
//     useCreateIndex: true,
//     useUnifiedTopology: true,
//   });
//   return connection.connection.db;
// };
