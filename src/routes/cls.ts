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
        user_id: Joi.number().required(),
        cl_element_id: Joi.number().required(),
        problem: Joi.string().required(),
        answer: Joi.string().required(),
        _public: Joi.number().required(),
        // token: Joi.string().required()
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      logger.debug("Calling CL CRUD apis : %o", req.body);

      try {
        const { user_id, cl_element_id, problem, answer, _public } = req.body;
        // const clServiceInstance = Container.get(CLService);
        // const { token } = await clServiceInstance.makeCLE(
        //   user_id,
        //   cl_element_id,
        //   problem,
        //   answer,
        //   _public
        // );

        //ce야 내가 자소서 보내줄테니까 키워드 목록 보내줘!
        //그리고 DB에 저장해줘! 에 대한 내용이 담긴 함수를 불러오기
        const keywordServiceInstance = Container.get(KeywordService);
        const result = await keywordServiceInstance.putKeywordsInfoAfterCE(
          answer,
          cl_element_id
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
