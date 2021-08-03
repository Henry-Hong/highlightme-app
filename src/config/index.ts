import dotenv from "dotenv";
import path from "path";

// Set the NODE_ENV to 'development' by default
// process.env.NODE_ENV = process.env.NODE_ENV || "development";
let dotenvResult;
if (process.env.NODE_ENV === "production") {
  dotenvResult = dotenv.config({ path: path.join(__dirname, "./.prod.env") });
} else {
  dotenvResult = dotenv.config({ path: path.join(__dirname, "./.dev.env") });
}
if (dotenvResult.error) {
  // This error should crash whole process
  throw new Error("⚠️  Couldn't find .env file  ⚠️");
}

export default {
  port: process.env.PORT,
  logs: {
    level: process.env.LOG_LEVEL || "silly",
  },
  dbURL: process.env.DB_URL, //databaseURL: process.env.MONGODB_URI,
  dbPassword: "Marare12#$", //dbPassword: process.env.AURORADB_PW,
  dbPort: 3306,
  dbUser: "admin",
  dbName: "highlightme_aurora",
  api: {
    prefix: "/api",
  },
};
