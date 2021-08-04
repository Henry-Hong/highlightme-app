import { Router, Request, Response, NextFunction } from "express";
import { Container } from "typedi";
import { celebrate, Joi, Segments } from "celebrate";
import { Logger } from "winston";

import CLService from "../services/cl";
import { IUserInputDTO } from "../interfaces/IUser";

const route = Router();

export default (app: Router) => {
  app.use("/cls", route);

  route.get("/", (req: Request, res: Response) => {
    return res.json({ msg: "yes this is /tests" }).status(200);
  });

  route.post(
    "/",
    celebrate({
      [Segments.BODY]: Joi.object({
        user_id: Joi.string().required(),
        cl_element_id: Joi.required
        problem: Joi.string().required(),
        answer: Joi.string().required(),
        _public: Joi.boolean().required(), //프론트에서 무적권1
        // token: Joi.string().required()
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      // logger.debug("Calling Sign-In endpoint with body: %o", req.body);
/////////////////////////////
      // const { comment } = req.body;

      try {
        const { user_id, cl_element_id, problem, answer, _public } = req.body;
        const clServiceInstance = Container.get(CLService);
        const { result } = await clServiceInstance.uploadCL(
          user_id,
          cl_element_id,
          problem,
          answer,
          _public
        );
        // console.log(req.body.cls);
        return res.json({ result: result }).status(200);
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );
};
