import { Router, Request, Response, NextFunction } from "express";
import { Container } from "typedi";
import { celebrate, Joi, Segments } from "celebrate";
import { Logger } from "winston";
import cookieParser from "cookie-parser";

import CLService from "../services/cl";
import config from "../config";
import { IUser } from "../interfaces/IUser";
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
      const { userId } = (req.user as IUser) || { userId: config.constUserId };

      const { elements, title, company, tags, comments } = req.body;
      const clServiceInstance = Container.get(CLService);
      const statusCode = await clServiceInstance.makeCLE(
        elements,
        userId,
        title,
        company,
        tags,
        comments
      );
      // return res.status(200).json(result);
      return res.sendStatus(statusCode);
    } catch (e) {
      logger.error("🔥 error: %o", e);
      return next(e);
    }
  });

  //C2 GET localhost:3001/api/cls
  route.get("/", async (req: Request, res: Response, next: NextFunction) => {
    logger.debug(`Calling GET '/api/cls', req.user: %o`, req.user);

    try {
      const { userId } = (req.user as IUser) || { userId: config.constUserId };
      const clServiceInstance = Container.get(CLService);
      const result = await clServiceInstance.getElements(userId);
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
      const { userId } = (req.user as IUser) || { userId: config.constUserId };
      const { cl_element_id: index } = req.body;
      const clServiceInstance = Container.get(CLService);
      const statusCode = await clServiceInstance.deleteCLE(
        parseInt(index),
        userId
      );
      return res.sendStatus(statusCode);
    } catch (e) {
      logger.error("🔥 error: %o", e);
      return next(e);
    }
  });
};
