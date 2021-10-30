import { Container, Service, Inject } from "typedi";
import mysql2 from "mysql2/promise";
import config from "../config";
import { randomBytes } from "crypto";
import { Logger, loggers } from "winston";
import crypto from "crypto";

import { IUser } from "../interfaces/IUser";
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
    const pool = Container.get<mysql2.Pool>("pool");

    const dummyUser: any = {
      _id: "sample id",
      nickname: "기운찬 곰",
      email: email,
      password: password,
      salt: "냠냠",
    };

    const query = "SELECT * FROM User WHERE email = ?";
    const [user] = await pool.query(query, [email]);

    if (!user) {
      console.log("No user");
    }

    const salt = "wanna go home";
    //const salt = createSalt();

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
  public async SignUp(
    email: string,
    password: string,
    nickname: string,
    fieldIds: number[]
  ): Promise<{ token: string }> {
    // 1. 커넥션
    const pool = Container.get<mysql2.Pool>("pool");

    // 2. 이메일 벨리데이션 -> 이메일 중복확인
    const emailValidationQuery = "SELECT COUNT(*) FROM User WHERE email = ?";
    const [counts] = await pool.query(emailValidationQuery, [email]);
    // if (parseInt(counts) > 0) {
    //   console.log("이미 있는 이메일입니다.");
    // }

    // 3. 중복아니면 DB에 넣기
    const userInsertQuery =
      "INSERT INTO User VALUES (?, ?, ?, ?, NOW(), NOW())";
    // password를 암호화해서 넣어주는 코드가 필요해요 나중에 hasher라는 함수로 만들어줘도될듯
    // const salt = createSalt();
    // const derivedKey = await getDerivedKey(
    //   password,
    //   salt,
    //   100000,
    //   64,
    //   "sha512"
    // );
    // password = derivedKey.toString('hex')
    const [userInsertResult] = await pool.query(userInsertQuery, [
      email,
      password,
      nickname,
      0,
    ]);
    if (!userInsertResult) {
      console.log("유저생성실패");
    }

    // 4. token 넘겨주기!
    // 4-1. 토큰생성
    // 4-2. 토큰리턴
    // return { token: "failed" }
    return { token: "success" };
  }
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
