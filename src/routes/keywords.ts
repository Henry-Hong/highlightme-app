import { Router, Request, Response, NextFunction } from "express";
import { Container } from "typedi";
import { celebrate, Joi, Segments } from "celebrate";
import { Logger } from "winston";

import CLService from "../services/cl";
import config from "../config";
import { IUser } from "../interfaces/IUser";
import { resourceLimits } from "worker_threads";
import TestService from "../services/test";
import KeywordService from "../services/keyword";

const route = Router();

export default (app: Router) => {
  app.use("/keywords", route);

  /**
   * K1, K2 GET localhost:3001/api/keywords
   * 한 유저의 키워드를 불러오는 apis
   */
  route.get("/", async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get("logger");
    logger.debug(`Calling GET '/api/keywords'`);

    try {
      const { userId } = (req.user as IUser) || { userId: config.constUserId };
      const keywordServiceInstance = Container.get(KeywordService);
      const [statusCode, keywords] =
        await keywordServiceInstance.getUserKeywords(userId);

      return res.status(statusCode).json(keywords);
    } catch (e) {
      logger.error("🔥 error: %o", e);
      return next(e);
    }
  });

  // K3 POST localhost:3001/api/keywords/read
  // 한 키워드를 읽었음을 알리는 api
  route.post(
    "/read",
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      logger.debug(`Calling POST '/api/keywords/read', req.body: %o`, req.body);

      try {
        const { userId } = (req.user as IUser) || {
          userId: config.constUserId,
        };
        const { user_keyword_id } = req.body;
        const keywordServiceInstance = Container.get(KeywordService);
        const result = await keywordServiceInstance.updateKeywordRead(
          userId,
          parseInt(user_keyword_id)
        );

        return res.json(result).status(200);
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  // K4 POST localhost:3001/api/keywords/answered
  // 한 키워드에 답변했음을 알리는 api
  route.post(
    "/answered",
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      logger.debug(
        `Calling POST '/api/keywords/answered', req.body: %o`,
        req.body
      );

      try {
        const { userId } = (req.user as IUser) || {
          userId: config.constUserId,
        };
        const keywordId = parseInt(req.body.keywordId);

        const keywordServiceInstance = Container.get(KeywordService);
        const result = await keywordServiceInstance.updateKeywordAnswered(
          userId,
          keywordId
        );

        return res.json(result).status(200);
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );
};
