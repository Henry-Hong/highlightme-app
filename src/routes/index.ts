//const express = require("express");
import { Router } from "express"; //훨씬 효율적인 import문법

import tests from "./tests";
import users from "./users";
import cls from "./cls";
import keywords from "./keywords";
import questions from "./questions";

export default () => {
  const app = Router();

  tests(app);
  users(app);
  keywords(app);
  cls(app);
  questions(app);

  return app;
};
