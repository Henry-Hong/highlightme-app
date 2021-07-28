import { Router } from "express";

import tests from "./tests.controller";
import users from "./users.controller";
import cls from "./cls.controller";

export default () => {
  const app = Router();

  tests(app);
  users(app);
  cls(app);

  return app;
};
