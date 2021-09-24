import { Router, Request, Response, NextFunction } from "express";
import { Container } from "typedi";
import { celebrate, Joi, Segments } from "celebrate";
import { Logger } from "winston";

import CLService from "../services/cl";
import config from "../config";
import { IUserInputDTO } from "../interfaces/IUser";
import { resourceLimits } from "worker_threads";
import TestService from "../services/test";
import KeywordService from "../services/keyword";

const route = Router();

export default (app: Router) => {
  app.use("/cls", route);

  //POST localhost:3001/api/cls
  route.post(
    "/",
    celebrate({
      [Segments.BODY]: Joi.object({
        CLES: Joi.string().required(),
        //   [
        //   {
        //     cl_element_id: Joi.number().required(),
        //     problem: Joi.string().required(),
        //     answer: Joi.string().required(),
        //     _public: Joi.number().required(),
        //   },
        // ],
        cl_id: Joi.number().required(), //이거 프론트에서 안가지고 있을듯?
        user_id: Joi.number().required(),
        title: Joi.string().required(),
        company: Joi.string().required(),
        tags: Joi.string().required(),
        comments: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      logger.debug("Calling CL CRUD apis : %o", req.body);

      try {
        const { CLES, cl_id, user_id, title, company, tags, comments } =
          req.body;
        const clServiceInstance = Container.get(CLService);
        const result = await clServiceInstance.makeCLE(
          CLES,
          cl_id,
          user_id,
          title,
          company,
          tags,
          comments
        );

        return res.json(result).status(200);
        // return res.json({ result: token }).status(200);
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );
};
