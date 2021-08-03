import "reflect-metadata"; // We need this in order to use @Decorators

import express, { Router } from "express";

import loader from "./loaders";
import config from "./config";

async function startServer() {
  const app = express();
  /**
   * A little hack here
   * Import/Export can only be used in 'top-level code'
   * Well, at least in node 10 without babel and at the time of writing
   * So we are using good old require.
   **/
  await loader(app);

  app.listen(config.port, () => {
    console.log(`Express.js listening on port ${config.port}`);
  });
}

startServer();
