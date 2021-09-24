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
  const logger: Logger = Container.get("logger");
  const FieldServiceInstance = Container.get(FieldService);

  //GET localhost:3001/api/fields
  route.get("/", async (req: Request, res: Response, next: NextFunction) => {
    // logger.debug("Calling fields apis : %o", req.body);
    try {
      const user_id = parseInt(req.body.user_id);
      const result = await FieldServiceInstance.getFieldsList(user_id);
      return res.json(result);
    } catch (e) {
      logger.error("🔥 error: %o", e);
      return next(e);
    }
  });

  //POST localhost:3001/api/fields
  route.post("/", async (req: Request, res: Response, next: NextFunction) => {
    // logger.debug("Calling fields apis : %o", req.body);
    try {
      //사용자필드저장하기!
      //1. 일단 req.body로 사용자의 필드선택을 받을것이다. -> 대부분은 field_id로 올것이다.
      //{"field_ids": ["1","2","3"]}
      //2. 방금 내가 준거 데이터베이스에 저장좀해주세요!
      //2.1 UserFields 테이블에 User_id라는 이름으로 저장!
      const { user_id, field_ids } = req.body;
      const result = await FieldServiceInstance.createOrUpdateUserFields(
        parseInt(user_id),
        JSON.parse(field_ids)
      );
      return res.json(result);
    } catch (e) {
      logger.error("🔥 error: %o", e);
      return next(e);
    }
  });
};
