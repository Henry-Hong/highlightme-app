import { Router, Request, Response, NextFunction } from "express";
import { Container } from "typedi";
import { celebrate, Joi, Segments } from "celebrate";
import { Logger } from "winston";
import cookieParser from "cookie-parser";

import CLService from "../services/cl";
import config from "../config";
import { IUserInputDTO } from "../interfaces/IUser";
import { resourceLimits } from "worker_threads";
import TestService from "../services/test";
import KeywordService from "../services/keyword";
import cors from "cors";

const route = Router();

export default (app: Router) => {
  app.use("/cls", route);
  const logger: Logger = Container.get("logger");

  //C1 POST localhost:3001/api/cls
  route.post("/", async (req: Request, res: Response, next: NextFunction) => {
    logger.debug(`Calling POST '/api/cls', req.body: %o`, req.body);

    try {
      console.log(req.user);
      const { user_id } = (req.user as any) || { user_id: 7 };
      const { CLES, cl_id, title, company, tags, comments } = req.body;
      const clServiceInstance = Container.get(CLService);
      const result = await clServiceInstance.makeCLE(
        CLES,
        parseInt(cl_id),
        parseInt(user_id),
        title,
        company,
        tags,
        comments
      );
      return res.status(200).json(result);
    } catch (e) {
      logger.error("🔥 error: %o", e);
      return next(e);
    }
  });

  // function corsCheck(req : any, callback : any) {
  // let corsOptions;
  // const acceptList = ["https://www.hlight.me", "https://hlight.me", "http://localhost:3000"]
  // if (acceptList.indexOf(req.header('Origin')) !== -1) {
  //   corsOptions = { origin: true, credential: true };
  // } else {
  //   corsOptions = { origin: false };
  // }
  // callback(null, corsOptions);
  // }

  //C2 GET localhost:3001/api/cls
  route.get("/", async (req: Request, res: Response, next: NextFunction) => {
    logger.debug(`Calling GET '/api/cls', req.user: %o`, req.user);

    try {
      const { user_id } = (req.user as any) || { user_id: 7 };
      const clServiceInstance = Container.get(CLService);
      const result = await clServiceInstance.getCLEsById(user_id);
      return res.status(200).json(result);
    } catch (e) {
      logger.error("🔥 error: %o", e);
      return next(e);
    }
  });

  //C3 DELETE localhost:3001/api/cls
  route.delete("/", async (req: Request, res: Response, next: NextFunction) => {
    logger.debug(`Calling DELETE '/api/cls', req.body: %o`, req.body);

    try {
      const { user_id } = (req.user as any) || { user_id: 7 };
      const { cl_element_id } = req.body;
      const clServiceInstance = Container.get(CLService);
      const result = await clServiceInstance.deleteCLE(
        parseInt(cl_element_id),
        parseInt(user_id)
      );
      return res.status(200).json(result);
    } catch (e) {
      logger.error("🔥 error: %o", e);
      return next(e);
    }
  });
};
