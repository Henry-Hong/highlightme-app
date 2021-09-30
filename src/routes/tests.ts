import { Router, Request, Response, NextFunction } from "express";
import TestService from "../services/test";
import { Container } from "typedi";

const route = Router();

export default (app: Router) => {
  app.use("/tests", route);

  //localhost:3001/api/tests/
  route.get("/", (req: Request, res: Response) => {
    return res.json({ msg: "아니 이제야 되네?" }).status(200);
  });

  route.get("/2", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const testServiceInstance = Container.get(TestService);
      const { content } = await testServiceInstance.dbTest();
      return res.json({ result: content }).status(200);
    } catch (e) {
      console.log("Test Error!");
      return next(e);
    }
  });

  route.post("/3", (req: Request, res: Response, next: NextFunction) => {
    console.log(req.body);
    console.log(typeof req.body.e); //string
    res.send("good");
  });
};
