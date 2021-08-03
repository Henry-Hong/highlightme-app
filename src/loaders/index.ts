import express from "express";
import dependencyInjectorLoader from "./dependencyInjector";
import { load } from "./mysql";
import expressLoader from "./express";
import Logger from "./logger";

export default async (expressApp: express.Application) => {
  // const mysql2Connection = await mysql2Loader();
  // Logger.info("✌️ DB loaded and connected!");

  const db = await load();

  //유저모델 정의
  const userModel = {
    name: "userModel",
    model: require("../models/user").default,
  };

  await dependencyInjectorLoader({
    db,
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
