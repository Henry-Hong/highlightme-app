import { Router } from "express";

import tests from "./tests";
import users from "./users";
import cls from "./cls";

export default () => {
  const app = Router();

  tests(app);
  users(app);
  cls(app);

  return app;
};
