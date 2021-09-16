import { Container, Service, Inject } from "typedi";
import mysql2 from "mysql2/promise";
import config from "../config";
import { randomBytes } from "crypto";
import { Logger, loggers } from "winston";
import crypto from "crypto";
import bycrypt from "bcrypt";

import { IUser, IUserInputDTO } from "../interfaces/IUser";
import { json } from "express";
import { parse, resolve } from "path/posix";

import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

export default () => {
  passport.serializeUser((user: any, done: (err: any, id?: any) => void) => {
    if (user.provider == "google") {
      done(undefined, user.email); //세션에 자동 저장
    }
    // 다른 oauth 등록 하려면 console.log(user) 먼저 해보기!
    // else if (user.provider == "kakao") {
    //   done(undefined, user.id);
    // }
  });

  passport.deserializeUser(
    (email: any, done: (err: any, user: any) => void) => {
      // UserCollection.findById(id, (err: Error, user: UserDocument) => {
      //   done(err, user);
      // });
      done(undefined, email);
    }
  );

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_SECRET as string,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        // console.log("profile", profile);
        const db = Container.get<mysql2.Connection>("db");
        const {
          id: tokenId,
          emails: [{ value: email }],
          provider,
        } = profile as any;
        try {
          const queryUserExist = "SELECT * FROM User WHERE email=(?)";
          const [userExistResult] = await db.query(queryUserExist, [email]);
          const [userExistResultParse] = JSON.parse(
            JSON.stringify(userExistResult)
          );
          // console.log(userExistResultParse.password);

          // 회원가입절차 진행
          if (!userExistResultParse) {
            //회원가입코드 findOrCreate
            console.log("회원가입을 진행합니다.");
            const queryCreateUser = `
              INSERT INTO User (email, password, nickname, role_type, create_at, modified_at)
              VALUES(?,?,?,?,NOW(),NOW())`;
            const [createUserResult] = await db.query(queryCreateUser, [
              email,
              tokenId,
              "sample",
              "2",
            ]);
            // console.log(createUserResult);
            // const [createUserResultParse] = JSON.parse(
            //   JSON.stringify(createUserResult)
            // );
            return done(null, { tokenId, email, provider, isNew: true });
          }
          // 이미 있는 계정이면..
          // 로그인을 시켜야겠지?
          return done(null, { tokenId, email, provider, isNew: false });
        } catch (error: any) {
          return done(error);
        }
        //여기 있는 done은 serialize에서 받는다아이가!
      }
    )
  );

  // passport.use(
  //   new LocalStrategy(
  //     {
  //       usernameField: "email",
  //       passwordField: "password",
  //       session: true,
  //     },
  //     async (email, password, done): Promise<void> => {
  //       const db = Container.get<mysql2.Connection>("db");

  //       try {
  //         const queryUserExist = "SELECT * FROM User WHERE email=(?)";
  //         const [userExistResult] = await db.query(queryUserExist, [email]);
  //         const [userExistResultParse] = JSON.parse(
  //           JSON.stringify(userExistResult)
  //         );
  //         // console.log(userExistResultParse.password);

  //         // 회원가입절차 진행
  //         if (!userExistResultParse) {
  //           //회원가입코드
  //           console.log("회원가입을 진행합니다.");
  //           done(null, false, { message: "회원가입이 완료되었습니다." });
  //           //요 done이 어디로가는게지
  //         }

  //         // 로그인 절차 진행
  //         if (
  //           true ===
  //           bycrypt.compareSync(password, userExistResultParse.password)
  //         ) {
  //           //비밀번호 같음
  //           done(null, userExistResultParse);
  //         } else {
  //           //비밀번호 틀림
  //           done(null, false, {
  //             message: "비밀번호가 일치하지 않습니다.",
  //           });
  //         }
  //       } catch (error) {
  //         done(error);
  //       }
  //     }
};

//---------------local 로그인 관련---------------------------------------------------
// const createSalt = () =>
//   new Promise((resolve, reject) => {
//     crypto.randomBytes(64, (err, buf) => {
//       if (err) reject(err);
//       resolve(buf.toString("base64"));
//     });
//   });

// async function getDerivedKey(
//   password: string,
//   salt: string,
//   iterations: number,
//   keyLength: number,
//   digest: string
// ): Promise<Buffer> {
//   return new Promise<Buffer>((resolve, reject) => {
//     crypto.pbkdf2(password, salt, 100000, 64, digest, (err, derivedKey) => {
//       resolve(derivedKey);
//     });
//   });
// }
