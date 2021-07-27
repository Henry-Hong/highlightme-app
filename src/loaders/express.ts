import express, {
  Request,
  Response,
  ErrorRequestHandler,
  NextFunction,
} from "express";
import cors from "cors";

import routes from "../routes";
import config from "../config";

export default (app: express.Application) => {
  /**
   * Health Check endpoints
   * @TODO Explain why they are here
   */
  app.get("/status", (req: Request, res: Response) => {
    res.status(200).send("<h1>Server Alive!</h1>");
  });

  // The magic package that prevents frontend developers going nuts
  // Alternate description:
  // Enable Cross Origin Resource Sharing to all origins by default
  app.use(cors());

  // Middleware that transforms the raw string of req.body into json
  // Bodyparser deprecated so use internal features
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // Middleware that transforms the raw string of req.body into json
  // app.use(bodyParser.json());
  // Load API routes
  app.use(config.api.prefix, routes());

  /// catch 404 and forward to error handler
  app.use((req: Request, res: Response, next: NextFunction) => {
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
