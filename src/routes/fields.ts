import { Router, Request, Response, NextFunction } from "express";
import { Container } from "typedi";
import { celebrate, Joi, Segments } from "celebrate";
import { Logger } from "winston";

// import CLService from "../services/cl";
import FieldService from "../services/field";
import config from "../config";

import * as fs from "fs";
import * as path from "path";

const route = Router();

export default (app: Router) => {
  //localhost:3001/api/fields
  app.use("/fields", route);
  const logger: Logger = Container.get("logger");
  const FieldServiceInstance = Container.get(FieldService);

  //GET localhost:3001/api/fields
  route.get("/", async (req: Request, res: Response, next: NextFunction) => {
    logger.debug(`Calling GET "/api/fields", req.body: %o`, req.body);
    try {
      // const result = await FieldServiceInstance.getFieldsList(user_id);
      return res
        .status(200)
        .sendFile(path.join(__dirname, "../data/fields.json"));
    } catch (e) {
      logger.error("🔥 error: %o", e);
      return next(e);
    }
  });

  //POST localhost:3001/api/fields
  route.post("/", async (req: Request, res: Response, next: NextFunction) => {
    logger.debug(`Calling POST "/api/fields", req.body: %o`, req.body);
    try {
      const { user_id, field_ids } = req.body;
      const result = await FieldServiceInstance.createOrUpdateUserFields(
        parseInt(user_id),
        field_ids
      );
      return res.json(result);
    } catch (e) {
      logger.error("🔥 error: %o", e);
      return next(e);
    }
  });
};
