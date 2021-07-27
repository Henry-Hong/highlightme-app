import { Router } from "express";
import test from "./tests.controller";

export default () => {
  const app = Router();

  test(app);

  return app;
};
