import { Router } from "express";

import tests from "./tests.controller";
import users from "./users.controller";

export default () => {
  const app = Router();

  tests(app);
  users(app);

  return app;
};
