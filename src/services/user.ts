import { Container, Service, Inject } from "typedi";
import mysql2 from "mysql2/promise";
import config from "../config";
import { randomBytes } from "crypto";
import { Logger, loggers } from "winston";
import crypto from "crypto";

import { IUser, IUserInputDTO } from "../interfaces/IUser";
import { json } from "express";
import { resolve } from "path/posix";

const createSalt = () =>
  new Promise((resolve, reject) => {
    crypto.randomBytes(64, (err, buf) => {
      if (err) reject(err);
      resolve(buf.toString("base64"));
    });
  });

@Service() //나중에 인스턴스로 사용하겠다!
export default class UserService {
  constructor(
    @Inject("logger") private logger: Logger // @Inject("db") private db: mysql2/promise.Connection
  ) {}

  //로그인기능
  public async Login(
    email: string,
    password: string
  ): Promise<{ user: IUser; token: string }> {
    const db = Container.get<mysql2.Connection>("db");

    const dummyUser: IUser = {
      _id: "sample id",
      nickname: "기운찬 곰",
      email: email,
      password: password,
      salt: "냠냠",
    };

    const query = "SELECT * FROM User WHERE email = ?";
    const [user] = await db.query(query, [email]);

    if (!user) {
      console.log("No user");
    }

    const salt = "wanna go home";

    const derivedKey = await getDerivedKey(
      password,
      salt,
      100000,
      64,
      "sha512"
    );

    if (derivedKey.toString("hex") === password) {
      return { user: dummyUser, token: "success!!!" };
    } else {
      return { user: dummyUser, token: "failed!!!" };
    }
  }

  //회원가입기능
  public async SignUp() {}
}

async function getDerivedKey(
  password: string,
  salt: string,
  iterations: number,
  keyLength: number,
  digest: string
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 64, digest, (err, derivedKey) => {
      resolve(derivedKey);
    });
  });
}
