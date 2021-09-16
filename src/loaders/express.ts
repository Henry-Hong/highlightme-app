import express, {
  Request,
  Response,
  ErrorRequestHandler,
  NextFunction,
} from "express";
import cors from "cors";

//login 관련 모듈 임포트
// import passportConfig from "../config/passport"
import passport from "passport";
import routes from "../routes";
import config from "../config";
import session from "express-session";

export default (app: express.Application) => {
  // 헬스체크
  app.get("/status", (req: Request, res: Response) => {
    res.status(200).send("<h1>Server Alive!</h1>");
  });

  //미들웨어: Cross Origin Resource Sharing to all origins by default
  //XMLHttpRequest랑 FetchAPI 사용할때 쓰는거라곤하는데 뭔지잘모르겠다.
  app.use(cors());

  //미들웨어: req.body를 json형식으로 볼 수 있게 해준다.
  app.use(express.urlencoded({ extended: true })); //URL에 한글, 공백등이 포함되면 원래 잘 이상하게 요청이 들어오는거방지
  app.use(express.json());

  //미들웨어: 뷰엔진
  app.set("view engine", "ejs");
  app.set("views", "/Users/heerim/highlightme-node/src/views");

  //미들웨어: passport 미들웨어 설정
  app.use(
    session({
      secret: process.env.SESSION_SECRET as string,
      resave: false,
      saveUninitialized: true,
      cookie: {
        httpOnly: true,
        secure: false,
        // maxAge: 1000 * 60,
      },
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());

  //미들웨어: 라우팅. prefix붙임 (~/api)
  app.use(config.api.prefix, routes());

  //미들웨어: 404에러를 catch한 후, 에러핸들러로 보냄
  app.use((req: Request, res: Response, next: NextFunction) => {
    // next(createError(404));
    const err = new Error("Not Found");
    res.status(404);
    res.json({
      errors: {
        message: err.message,
      },
    });
  });

  /// error handlers
  //   app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  //     /**
  //      * Handle 401 thrown by express-jwt library
  //      */
  //     if (err.name === "UnauthorizedError") {
  //       return res.status(err.status).send({ message: err.message }).end();
  //     }
  //     return next(err);
  //   });
  //   app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  //     res.status(err.status || 500);
  //     res.json({
  //       errors: {
  //         message: err.message,
  //       },
  //     });
  //   });
};
