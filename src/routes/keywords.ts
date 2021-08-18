import { Router, Request, Response, NextFunction } from "express";
import { Container } from "typedi";
import { celebrate, Joi, Segments } from "celebrate";
import { Logger } from "winston";

import QuestionService from "../services/question";
import { IUserInputDTO } from "../interfaces/IUser";

const route = Router();

//localhost:3001/api/questions
export default (app: Router) => {
  app.use("/keywords", route);

  //localhost:3001/api/keywords
  route.get(
    "/",
    celebrate({
      [Segments.BODY]: Joi.object({
        // user_id: Joi.number().required(),
        // token: Joi.string().required()
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      logger.debug("Calling keywords endpoint");
      try {
        // const keyword_id = req.query.keyword as string;
        // const questionServiceInstance = Container.get(QuestionService);
        // const { token, content } = await questionServiceInstance.questionList(
        //   parseInt(keyword_id)
        // );
        // return res.json({ result: content }).status(200);
        return res.send("hello").status(200);
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );
};
