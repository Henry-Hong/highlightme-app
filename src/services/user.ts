import { Service, Inject } from "typedi";
// import db from "../loaders/mysql";
import mysql from "mysql";
import config from "../config";
import { randomBytes } from "crypto";
import { Logger } from "winston";

import { IUser, IUserInputDTO } from "../interfaces/IUser";
import { json } from "express";
import { resolve } from "path/posix";

@Service() //나중에 인스턴스로 사용하겠다!
export default class UserService {
  constructor(
    @Inject("logger") private logger: Logger // @Inject("db") private db: mysql.Connection
  ) {}

  //로그인기능
  public async Login(
    email: string,
    password: string
  ): Promise<{ user: IUser; token: string }> {
    const db = await mysql.createConnection({
      host: config.dbURL,
      port: config.dbPort,
      user: config.dbUser,
      password: config.dbPassword,
      database: config.dbName,
    });

    await db.connect((err) => {
      if (err) throw err;
      console.log("db연결 성공");
      db.query("use highlightme_aurora");
    });

    const query = `select * from User where email="cherryme@kakao.com"`;
    db.query(query, (err, result) => {
      if (err) throw err;
      console.log(result);
    });

    const dummyUser: IUser = {
      //3.
      _id: "sample id",
      nickname: "기운찬 곰",
      email: email,
      password: password,
      salt: "냠냠",
    };

    return { user: dummyUser, token: "dummy token" };
  }

  //회원가입기능
}
