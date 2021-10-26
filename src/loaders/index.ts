import express from "express";
import dependencyInjectorLoader from "./dependencyInjector";
import { getPool } from "./mysql";
import expressLoader from "./express";
import Logger from "./logger";

export default async (expressApp: express.Application) => {
  const pool = getPool();

  //유저모델 정의
  const userModel = {
    name: "userModel",
    model: require("../models/user").default,
  };

  await dependencyInjectorLoader({
    pool: pool,
    models: [
      userModel,
      // salaryModel,
      // whateverModel
    ],
  });

  Logger.info("✌️ Dependency Injector loaded");

  await expressLoader(expressApp);
  Logger.info("✌️ Express loaded");
};
