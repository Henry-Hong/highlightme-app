import { Router, Request, Response, NextFunction } from "express";
import { Container } from "typedi";
import { celebrate, Joi, Segments } from "celebrate";
import { Logger } from "winston";

import QuestionService from "../services/question";
import { IUserInputDTO } from "../interfaces/IUser";

const route = Router();

//localhost:3001/api/questions
export default (app: Router) => {
  app.use("/questions", route);

  // Q1 GET localhost:3001/api/questions
  // 키워드를 선택하고, 해당 키워드에 대한 질문리스트들을 뿌려줄때!
  route.get("/", async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get("logger");
    logger.debug(`Calling GET "/api/questions", req.body: %o`, req.body);
    try {
      const { user_keyword_id } = req.body;
      const questionServiceInstance = Container.get(QuestionService);
      const { token, content } = await questionServiceInstance.questionList(
        parseInt(user_keyword_id)
      );
      return res.json({ result: content }).status(200);
    } catch (e) {
      logger.error("🔥 error: %o", e);
      return next(e);
    }
  });

  // Q2 POST localhost:3001/api/questions/like
  // 특정 질문에 대해 좋아요를 남길때!
  route.post(
    "/like",
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      logger.debug(
        `Calling POST "/api/questions/like", req.body: %o`,
        req.body
      );
      try {
        const { question_id, isUp } = req.body;
        const { user_id } = (req.user as any) || { user_id: 7 }; //as any로 하지말고, Interface를 추가
        const questionServiceInstance = Container.get(QuestionService);
        const result = await questionServiceInstance.questionLike(
          parseInt(question_id),
          parseInt(isUp),
          user_id
        );
        return res.status(200).json(result);
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  // Q3 POST localhost:3001/api/questions/dislike
  // 특정 질문에 대해 싫어요를 남길때!
  route.post(
    "/dislike",
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      logger.debug(
        `Calling POST "/api/questions/dislike", req.body: %o`,
        req.body
      );
      try {
        const { question_id, isUp } = req.body;
        const { user_id } = (req.user as any) || { user_id: 7 }; //as any로 하지말고, Interface를 추가
        const questionServiceInstance = Container.get(QuestionService);
        const result = await questionServiceInstance.questionDislike(
          parseInt(question_id),
          parseInt(isUp),
          user_id
        );
        return res.status(200).json(result);
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );

  // Q5 POST localhost:3001/api/questions/answer
  // 특정 질문에 대해 답하기!
  route.post(
    "/answer",
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      logger.debug(
        `Calling POST '/api/questions/answer', req.body: %o`,
        req.body
      );
      try {
        const { user_question_id, answer } = req.body;
        const { user_id } = (req.user as any) || { user_id: 7 }; //as any로 하지말고, Interface를 추가
        const questionServiceInstance = Container.get(QuestionService);
        const result = await questionServiceInstance.answerToQuestion(
          parseInt(user_question_id),
          answer
        );
        return res.status(200).json(result);
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );
};
