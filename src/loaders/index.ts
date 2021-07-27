import express from "express";
import dependencyInjectorLoader from "./dependencyInjector";
import expressLoader from "./express";
import Logger from "./logger";
//We have to import at least all the events once so they can be triggered

export default async (expressApp: express.Application) => {
  //   const mongoConnection = await mongooseLoader();
  //   Logger.info("✌️ DB loaded and connected!");

  /**
   * WTF is going on here?
   *
   * We are injecting the mongoose models into the DI container.
   * I know this is controversial but will provide a lot of flexibility at the time
   * of writing unit tests, just go and check how beautiful they are!
   */

  const userModel = {
    name: "userModel",
    model: require("../models/user").default,
  };

  // It returns the agenda instance because it's needed in the subsequent loaders
  await dependencyInjectorLoader({
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
