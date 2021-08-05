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

  //localhost:3001/api/questions?keyword=블라블라
  route.post(
    "/",
    celebrate({
      [Segments.BODY]: Joi.object({
        user_id: Joi.number().required(),
        
        // token: Joi.string().required()
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      // const logger: Logger = Container.get("logger");
      // logger.debug("Calling Sign-In endpoint with body: %o", req.body);
      // const { comment } = req.body;

      try {
        const { user_id, cl_element_id, problem, answer, _public } = req.body;
        const clServiceInstance = Container.get(CLService);
        const { token } = await clServiceInstance.makeCLE(
          user_id,
          cl_element_id,
          problem,
          answer,
          _public
        );
        // console.log(req.body.cls);
        return res.json({ result: token }).status(200);
      } catch (e) {
        // logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );
  */
};
