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
        comment: Joi.string().required(),
        cl_elements: Joi.required(),
        // cl_elements: Joi.array().items(
        //   Joi.object({
        //     problem: Joi.string(),
        //     answer: Joi.string(),
        //     // public: Joi.boolean().required(),
        //   })
        // ),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      // logger.debug("Calling Sign-In endpoint with body: %o", req.body);
      console.log(req.body.cls);

      try {
        // const { email, password } = req.body;
        // const userServiceInstance = Container.get(UserService);
        // const { user, token } = await userServiceInstance.SignIn(
        //   email,
        //   password
        // );
        // console.log(req.body.cls);
        return res.json({ yes: "yes" }).status(200);
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );
};
