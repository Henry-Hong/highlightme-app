import { Router, Request, Response, NextFunction } from "express";
import { Container } from "typedi";
import { celebrate, Joi, Segments } from "celebrate";
import { Logger } from "winston";

// import CLService from "../services/cl";
import FieldService from "../services/field";
import config from "../config";

import * as fs from "fs";
import * as path from "path";
import { IUser } from "../interfaces/IUser";

const route = Router();

export default (app: Router) => {
  app.use("/fields", route);

  const logger: Logger = Container.get("logger");
  const FieldServiceInstance = Container.get(FieldService);

  /**
   * U5.1 GET localhost:3001/api/fields
   * 직무정보가 들어있는 static 파일 바로 제공
   */
  route.get("/", async (req: Request, res: Response, next: NextFunction) => {
    logger.debug(`Calling GET '/api/fields'`);
    try {
      return res
        .status(200)
        .sendFile(path.join(__dirname, "../data/fields.json"));
    } catch (e) {
      logger.error("🔥 error: %o", e);
      return next(e);
    }
  });

  /**
   * U5.2 POST localhost:3001/api/fields
   * 유저의 직무정보 업로드 or 업데이트
   */
  route.post("/", async (req: Request, res: Response, next: NextFunction) => {
    logger.debug(`Calling POST '/api/fields', req.body: %o`, req.body);
    try {
      const { userId } = (req.user as IUser) || { userId: config.constUserId };
      const { fieldIds } = req.body;
      const statusCode = await FieldServiceInstance.createOrUpdateUserFields(
        userId,
        fieldIds
      );
      return res.sendStatus(statusCode);
    } catch (e) {
      logger.error("🔥 error: %o", e);
      return next(e);
    }
  });
};
