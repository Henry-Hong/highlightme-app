import { Router, Request, Response, NextFunction } from "express";
import { Container } from "typedi";
import { celebrate, Joi } from "celebrate";
import { Logger } from "winston";

import UserService from "../services/user";
import { IUserInputDTO } from "../interfaces/IUser";

const route = Router();

export default (app: Router) => {
  app.use("/users", route);

  route.post(
    "/signin",
    celebrate({
      body: Joi.object({
        email: Joi.string().required(),
        password: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      logger.debug("Calling Sign-In endpoint with body: %o", req.body);
      try {
        const { email, password } = req.body;
        const userServiceInstance = Container.get(UserService);
        const { user, token } = await userServiceInstance.SignIn(
          email,
          password
        );
        return res.json({ user, token }).status(200);
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );
};
