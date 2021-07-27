import { Router } from "express";
import test from "./test.controller";

export default () => {
  const app = Router();

  test(app);

  return app;
};
