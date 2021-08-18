import { Router, Request, Response, NextFunction } from "express";
import { Container } from "typedi";
import { celebrate, Joi, Segments } from "celebrate";
import { Logger } from "winston";

import CLService from "../services/cl";
import { IUserInputDTO } from "../interfaces/IUser";

const route = Router();

export default (app: Router) => {
  app.use("/cls", route);

  route.post(
    "/",
    celebrate({
      [Segments.BODY]: Joi.object({
        user_id: Joi.number().required(),
        // cl_element_id: Joi.number().required(),
        problem: Joi.string().required(),
        answer: Joi.string().required(),
        _public: Joi.number().required(),
        // token: Joi.string().required()
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      // const logger: Logger = Container.get("logger");
      // logger.debug("Calling Sign-In endpoint with body: %o", req.body);
      // const { comment } = req.body;

      try {
        const cl_element_id = 0;
        const { user_id, problem, answer, _public } = req.body;
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
};
