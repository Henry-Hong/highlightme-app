import winston from "winston";
import winstonDaily from "winston-daily-rotate-file";

import config from "../config";

const logDir = "./logs"; // logs 디렉토리 하위에 로그 파일 저장

const transports = [
  // info 레벨 로그를 저장할 파일 설정
  new winstonDaily({
    level: "info",
    datePattern: "YYYY-MM-DD",
    dirname: logDir,
    filename: `%DATE%.log`,
    maxFiles: 30, // 30일치 로그 파일 저장
    zippedArchive: true,
  }),
  // error 레벨 로그를 저장할 파일 설정
  new winstonDaily({
    level: "error",
    datePattern: "YYYY-MM-DD",
    dirname: logDir + "/error", // error.log 파일은 /logs/error 하위에 저장
    filename: `%DATE%.error.log`,
    maxFiles: 30,
    zippedArchive: true,
  }),
  new winston.transports.Console({
    level: "debug", // debug이상 콘솔 출력
  }),
];
// if (process.env.NODE_ENV !== "development") {
//   transports.push(new winston.transports.Console());
// } else {
//   transports.push(
//     new winston.transports.Console({
//       format: winston.format.combine(
//         winston.format.cli(),
//         winston.format.splat()
//       ),
//     })
//   );
// }

const LoggerInstance = winston.createLogger({
  level: config.logs.level,
  levels: winston.config.npm.levels,
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports,
});

export default LoggerInstance;
