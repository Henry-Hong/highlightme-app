import { Router, Request, Response, NextFunction } from "express";
import { Container } from "typedi";
import { celebrate, Joi, Segments } from "celebrate";
import { Logger } from "winston";
import cookieParser from "cookie-parser";

import CLService from "../services/cl";
import config from "../config";
import { IUser } from "../interfaces/IUser";
import { resourceLimits } from "worker_threads";
import TestService from "../services/test";
import KeywordService from "../services/keyword";
import ScrapService from "../services/scrap";
import cors from "cors";
import questions from "./questions";

const route = Router();

export default (app: Router) => {
  app.use("/scraps", route);
  const logger: Logger = Container.get("logger");

  //S0 POST /api/scraps
  //특정질문 스크랩하기
  route.post("/", async (req: Request, res: Response, next: NextFunction) => {
    logger.debug(`POST '/api/scraps', req.body: %o`, req.body);

    try {
      const { userId } = (req.user as IUser) || { userId: config.constUserId };
      const { user_question_id, user_chain_question_id, question_id } =
        req.body;
      const scrapServiceInstance = Container.get(ScrapService);
      const result = await scrapServiceInstance.scrapQuestion(
        user_chain_question_id,
        user_question_id,
        question_id,
        userId
      );
      return res.status(200).json(result);
    } catch (e) {
      logger.error("🔥 error: %o", e);
      return next(e);
    }
  });

  //S1 GET /api/scraps
  //스크랩 질문 가져오기
  route.get("/", async (req: Request, res: Response, next: NextFunction) => {
    logger.debug(`GET '/api/scraps', req.user: %o`, req.user);

    try {
      const { userId } = (req.user as IUser) || { userId: config.constUserId };
      const scrapServiceInstance = Container.get(ScrapService);
      const result = await scrapServiceInstance.getScrapList(userId);
      return res.status(200).json(result);
    } catch (e) {
      logger.error("🔥 error: %o", e);
      return next(e);
    }
  });
};
