import "reflect-metadata"; // We need this in order to use @Decorators of typedi

import express, { Router, Request, Response } from "express";

import loader from "./loaders";
import config from "./config";

async function startServer() {
  const app = express();
  await loader(app);

  app.listen(config.port, () => {
    console.log(`Express.js listening on port ${config.port}`);
  });
}

startServer();
