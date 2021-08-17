import { Router, Request, Response, NextFunction } from "express";
import { Container } from "typedi";
import { celebrate, Joi, Segments } from "celebrate";
import { Logger } from "winston";

import QuestionService from "../services/question";
import { IUserInputDTO } from "../interfaces/IUser";

const route = Router();

//localhost:3001/api/questions
export default (app: Router) => {
  app.use("/questions", route);

  //localhost:3001/api/questions?keyword=블라블라
  //case1 : keyword string 으로 처리할것인지
  //case2 : keyword_id로 처리할것인지 -> 키워드 api에서 뷰화면에 뿌려질때, id도 같이 return 해줘야되는데.. 아마 같이 return 해주겠지?
  route.get(
    "/",
    celebrate({
      [Segments.BODY]: Joi.object({
        // 토큰밖에 확인할게없다. 토큰은 헤더값으로 들어가는걸로 알고있음!
        // user_id: Joi.number().required(),
        // token: Joi.string().required()
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      // const logger: Logger = Container.get("logger");
      // logger.debug("Calling Sign-In endpoint with body: %o", req.body);
      // const { comment } = req.body;

      try {
        const { keyword } = req.query;
        const _keyword = keyword?.toString(); //keyword가 undefined인 경우에는 toString() 하지 않는다.
        const questionServiceInstance = Container.get(QuestionService);
        const { token } = await questionServiceInstance.questionList(_keyword);

        return res.json({ result: token }).status(200);
      } catch (e) {
        // logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );
};