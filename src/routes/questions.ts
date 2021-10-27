import { Router, Request, Response, NextFunction } from "express";
import { Container } from "typedi";
import { celebrate, Joi, Segments } from "celebrate";
import { Logger } from "winston";

import QuestionService from "../services/question";
import { IUserInputDTO } from "../interfaces/IUser";
import config from "../config";

const route = Router();

///api/questions
export default (app: Router) => {
  app.use("/questions", route);

  /**
   * Q1 GET /api/questions
   * 키워드를 선택하고, 해당 키워드에 대한 질문리스트들을 뿌려줄때!
   */
  route.get("/", async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get("logger");
    logger.debug(`Calling GET '/api/questions', req.body: %o`, req.body);
    try {
      const { user_id: userId } = (req.user as any) || {
        user_id: config.constUserId,
      };
      const keywordId = parseInt(req.body.keywordId);

      const questionServiceInstance = Container.get(QuestionService);
      const [statusCode, questions] =
        await questionServiceInstance.loadQuestions(userId, keywordId);

      return res.status(statusCode).json(questions);
    } catch (e) {
      logger.error("🔥 error: %o", e);
      return next(e);
    }
  });

  /**
   * Q7 GET /api/questions/scrapped
   * 사용자의 스크랩한 질문들을 가져옴
   */
  route.get(
    "/scrapped",
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      logger.debug(
        `Calling GET '/api/questions/scrapped', req.body: %o`,
        req.body
      );
      try {
        const { user_id: userId } = (req.user as any) || {
          user_id: config.constUserId,
        };

        const questionServiceInstance = Container.get(QuestionService);
        const [statusCode, questions] =
          await questionServiceInstance.loadScrappedQuestions(userId);

        return res.status(statusCode).json(questions);
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  /**
   * Q2 POST /api/questions/like
   * 특정 질문에 대해 좋아요를 남길때!
   */
  route.post(
    "/like",
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      logger.debug(
        `Calling POST "/api/questions/like", req.body: %o`,
        req.body
      );
      try {
        const { user_id: userId } = (req.user as any) || {
          user_id: config.constUserId,
        };
        const questionId = parseInt(req.body.questionId);

        const questionServiceInstance = Container.get(QuestionService);
        const statusCode = await questionServiceInstance.likeQuestion(
          userId,
          questionId
        );

        return res.sendStatus(statusCode);
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  /**
   * Q3 POST /api/questions/dislike
   * 특정 질문에 대해 싫어요를 남길때!
   */
  route.post(
    "/dislike",
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      logger.debug(
        `Calling POST "/api/questions/dislike", req.body: %o`,
        req.body
      );
      try {
        const { user_id: userId } = (req.user as any) || {
          user_id: config.constUserId,
        };
        const questionId = parseInt(req.body.questionId);

        const questionServiceInstance = Container.get(QuestionService);
        const statusCode = await questionServiceInstance.dislikeQuestion(
          userId,
          questionId
        );

        return res.sendStatus(statusCode);
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  /**
   * Q5 POST /api/questions/answer
   * 특정 질문에 대해 답하기!
   */
  route.post(
    "/answer",
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      logger.debug(
        `Calling POST '/api/questions/answer', req.body: %o`,
        req.body
      );
      try {
        const { user_id: userId } = (req.user as any) || { user_id: 7 }; //TODO as any로 하지말고, Interface를 추가
        const questionId: number = parseInt(req.body.questionId);
        const keywordId: number = parseInt(req.body.keywordId);
        const answer: string = req.body.answer;

        const questionServiceInstance = Container.get(QuestionService);
        const [statusCode, result] =
          await questionServiceInstance.answerQuestion(
            userId,
            questionId,
            keywordId,
            answer
          );

        return res.status(statusCode).json(result);
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  /**
   * Q4 POST /api/questions/scrap
   * 특정 질문을 스크랩하거나 해제할 때!
   */
  route.post(
    "/scrap",
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      logger.debug(
        `Calling POST "/api/questions/scrap", req.body: %o`,
        req.body
      );
      try {
        const { user_id: userId } = (req.user as any) || {
          user_id: config.constUserId,
        };
        const questionId = parseInt(req.body.questionId);

        const questionServiceInstance = Container.get(QuestionService);
        const statusCode = await questionServiceInstance.scrapQuestion(
          userId,
          questionId
        );

        return res.sendStatus(statusCode);
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  /**
   * Q6 POST /api/questions/interviewListed
   * 특정 질문을 모의면접 질문 후보에 등록하거나 해제할 때!
   */
  route.post(
    "/interviewListed",
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      logger.debug(
        `Calling POST "/api/questions/interviewListed", req.body: %o`,
        req.body
      );
      try {
        const { user_id: userId } = (req.user as any) || {
          user_id: config.constUserId,
        };
        const questionId = parseInt(req.body.questionId);

        const questionServiceInstance = Container.get(QuestionService);
        const statusCode = await questionServiceInstance.interviewListQuestion(
          userId,
          questionId
        );

        return res.sendStatus(statusCode);
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );
};
