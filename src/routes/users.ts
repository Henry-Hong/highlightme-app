import { Router, Request, Response, NextFunction } from "express";
import { Container } from "typedi";
import { celebrate, Joi } from "celebrate";
import { Logger, loggers } from "winston";

import UserService from "../services/user";
import { IUserInputDTO } from "../interfaces/IUser";

const route = Router();

export default (app: Router) => {
  app.use("/users", route);

  route.get("/login", (req, res) => {
    const logger: Logger = Container.get("logger");
    logger.debug("login 기능 테스트중입니다. /login으로 라우팅 잘 됩니다.");

    res.render("login");
  });

  route.post(
    "/login",
    // celebrate({
    //   //celebrate 미들웨어 한번 써주고,
    //   body: Joi.object({
    //     email: Joi.string().required(),
    //     password: Joi.string().required(),
    //   }),
    // }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get("logger");
      logger.debug("Calling Sign-In endpoint with body: %o", req.body);

      try {
        const { email, password } = req.body; //req.body에 있는 여러가지 프로퍼티에서 email, password를 추출한다.

        //핵심은 여기 38, 39번줄 2개
        const userServiceInstance = Container.get(UserService); //서비스폴더에있는 유저서비스 가져온다.
        const { user, token } = await userServiceInstance.Login(
          email,
          password
        ); //비즈니스로직에 넘겨준 뒤에, user, token 정보를 저장.

        return res.json({ user, token }).status(200); //user, token 정보를 던져준다.
        //res.json()의 반환값은 Promise다. 기본 res의 반환값은 Response 스트림인데,
        //.json() 메서드를 통해 Response스트림을 읽을 수 있다.
        //Response는 데이터가 모두 받아진 상태가 아니다.
        //.json()으로 Response스트림을 가져와 완료될때까지 읽는다.
        //다읽은 body의 텍스트를 Promise형태로 반환한다.
      } catch (e) {
        logger.error("🔥 error: %o", e);
        return next(e);
      }
    }
  );
};
