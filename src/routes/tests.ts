import { Router, Request, Response } from "express";

const route = Router();

export default (app: Router) => {
  app.use("/tests", route);

  route.get("/", (req: Request, res: Response) => {
    return res.json({ msg: "아니 이제야 되네?" }).status(200);
  });

  route.get("/2", (req: Request, res: Response) => {
    return res.json({ msg: "yes this is /tests/2" }).status(200);
  });
};
