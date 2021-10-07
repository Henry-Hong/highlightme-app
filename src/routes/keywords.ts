import { Router, Request, Response, NextFunction } from "express";
import { Container } from "typedi";
import { celebrate, Joi, Segments } from "celebrate";
import { Logger } from "winston";

import CLService from "../services/cl";
import config from "../config";
import { IUserInputDTO } from "../interfaces/IUser";
import { resourceLimits } from "worker_threads";
import TestService from "../services/test";
import KeywordService from "../services/keyword";

const route = Router();

export default (app: Router) => {
  app.use("/keywords", route);

  //POST localhost:3001/api/keywords
  route.get("/", async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get("logger");
    logger.debug("Calling CL CRUD apis : %o", req.body);

    try {
      const user_id = req.query.user_id as string;

      const keywordServiceInstance = Container.get(KeywordService);
      const result = await keywordServiceInstance.getUserKeywords(
        parseInt(user_id)
      );

      return res.json(result).status(200);
      // return res.json({ result: token }).status(200);
    } catch (e) {
      logger.error("🔥 error: %o", e);
      return next(e);
    }
  });

  route.get(
    "/test",
    async (req: Request, res: Response, next: NextFunction) => {
      const keywordServiceInstance = Container.get(KeywordService);
      const result = await keywordServiceInstance.putKeywordsInfoAfterCE(
        7,
        "stringstringstring"
      );
      res.send("hello");
    }
  );
};
