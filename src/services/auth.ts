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
    done(undefined, user.id);
  });

  passport.deserializeUser((id: any, done: (err: any, user: any) => void) => {
    console.log(id);
    // UserCollection.findById(id, (err: Error, user: UserDocument) => {
    //   done(err, user);
    // });
    done(undefined, id);
  });

  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
        session: true,
      },
      async (email, password, done): Promise<void> => {
        const db = Container.get<mysql2.Connection>("db");

        try {
          const queryUserExist = "SELECT * FROM User WHERE email=(?)";
          const [userExistResult] = await db.query(queryUserExist, [email]);
          const [userExistResultParse] = JSON.parse(
            JSON.stringify(userExistResult)
          );
          // console.log(userExistResultParse.password);

          // 회원가입절차 진행
          if (!userExistResultParse) {
            //회원가입코드
            console.log("회원가입을 진행합니다.");
            done(null, false, { message: "회원가입이 완료되었습니다." });
            //요 done이 어디로가는게지
          }

          // 로그인 절차 진행
          if (
            true ===
            bycrypt.compareSync(password, userExistResultParse.password)
          ) {
            //비밀번호 같음
            done(null, userExistResultParse);
          } else {
            //비밀번호 틀림
            done(null, false, {
              message: "비밀번호가 일치하지 않습니다.",
            });
          }
        } catch (error) {
          done(error);
        }
      }

      //     UserCollection.findOne(
      //       { email: email.toLowerCase() },
      //       (err: Error, user: UserDocument): void => {
      //         if (err) {
      //           return done(err);
      //         }
      //         if (!user) {
      //           return done({ message: "toast.user.email_not_found" }, false);
      //         }
      //         user.comparePassword(password, (err: Error, isMatch: boolean) => {
      //           if (err) {
      //             return done(err);
      //           }
      //           if (isMatch) {
      //             return done(undefined, user);
      //           }
      //           return done({ message: "toast.user.password_error" }, false);
      //         });
      //       }
      //     );
      //   };
      // )
    )
  );
};

//------------------------------------------------------------------

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
