import { Router, Request, Response, NextFunction } from "express";
import { Container } from "typedi";
import { celebrate, Joi, Segments } from "celebrate";
import { Logger } from "winston";

// import CLService from "../services/cl";
import FieldService from "../services/field";
import config from "../config";

const route = Router();

export default (app: Router) => {
  //localhost:3001/api/fields
  app.use("/fields", route);

  route.get("/", async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get("logger");
    logger.debug("Calling fields apis : %o", req.body);

    try {
      const user_id = parseInt(req.body.user_id);
      const FieldServiceInstance = Container.get(FieldService);
      const result = await FieldServiceInstance.getFieldsList(user_id);
      return res.json(result);
    } catch (e) {
      logger.error("🔥 error: %o", e);
      return next(e);
    }
  });
};
