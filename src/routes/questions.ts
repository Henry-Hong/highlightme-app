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

  // Q1 POST localhost:3001/api/questions
  // 키워드를 선택하고, 해당 키워드에 대한 질문리스트들을 뿌려줄때!
  route.post("/", async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get("logger");
    logger.debug(`Calling POST '/api/questions', req.body: %o`, req.body);
    try {
      const { user_id } = (req.user as any) || { user_id: 7 };
      const { user_keyword_id } = req.body;
      const questionServiceInstance = Container.get(QuestionService);
      const result = await questionServiceInstance.questionList(
        parseInt(user_keyword_id)
      );
      return res.json(result).status(200);
    } catch (e) {
      logger.error("🔥 error: %o", e);
      return next(e);
    }
  });

  // Q2 좋아요, Q3 싫어요 API는 굳이 라우터를 만들 필요가 없다잉..

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
        const { user_question_id, user_keyword_id, answer } = req.body;
        const { user_id } = (req.user as any) || { user_id: 7 }; //as any로 하지말고, Interface를 추가
        const questionServiceInstance = Container.get(QuestionService);
        const result = await questionServiceInstance.answerToQuestion(
          parseInt(user_question_id),
          parseInt(user_keyword_id),
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
