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
  /**
   * Your favorite port
   */
  port: process.env.PORT,

  /**
   * Used by winston logger
   */
  logs: {
    level: process.env.LOG_LEVEL || "silly",
  },

  /**
   * That long string from mlab
   */
  databaseURL: process.env.MONGODB_URI,

  /**
   * API configs
   */
  api: {
    prefix: "/api",
  },
};
