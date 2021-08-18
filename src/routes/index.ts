//const express = require("express");
import { Router } from "express"; //훨씬 효율적인 import문법

import tests from "./tests";
import users from "./users";
import cls from "./cls";
import questions from "./questions";
import keywords from "./keywords";

export default () => {
  const app = Router();

  tests(app);
  users(app);
  cls(app);
  questions(app);
  keywords(app);

  return app;
};
