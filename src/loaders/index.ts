import express from "express";
import dependencyInjectorLoader from "./dependencyInjector";
import mysqlLoader from "./mysql";
import expressLoader from "./express";
import Logger from "./logger";

export default async (expressApp: express.Application) => {
  // const mysqlConnection = await mysqlLoader();
  // Logger.info("✌️ DB loaded and connected!");

  //유저모델 정의
  const userModel = {
    name: "userModel",
    model: require("../models/user").default,
  };

  await dependencyInjectorLoader({
    // mysqlConnection,
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
