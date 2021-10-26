import { Container, Service, Inject } from "typedi";
import mysql2 from "mysql2/promise";

import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { parseObject } from "../utils";

export default () => {
  passport.serializeUser((user: any, done: (err: any, id?: any) => void) => {
    console.log("serializeUser", user);
    if (user.provider == "google") {
      done(undefined, { user_id: user.user_id }); //세션에 자동 저장
    } else {
      done(undefined, { user_id: user.user_id });
    }
    // 다른 oauth 등록 하려면 console.log(user) 먼저 해보기!
    // else if (user.provider == "kakao") {
    //   done(undefined, user.id);
    // }
  });

  passport.deserializeUser(
    (user_id: any, done: (err: any, user: any) => void) => {
      // UserCollection.findById(id, (err: Error, user: UserDocument) => {
      //   done(err, user);
      // });
      console.log("deserializeUser", user_id);
      done(undefined, user_id);
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
        console.log("profile", profile);
        const pool = Container.get<mysql2.Pool>("pool");
        const {
          id: tokenId,
          emails: [{ value: email }],
          provider,
        } = profile as any;
        try {
          const queryUserExist = "SELECT * FROM User WHERE email=(?)";
          const [userExistResult] = await pool.query(queryUserExist, [email]);
          const [userExistResultParse] = JSON.parse(
            JSON.stringify(userExistResult)
          );
          let user_id = userExistResultParse?.user_id;
          // console.log(userExistResultParse.password);

          // 회원가입절차 진행
          if (!userExistResultParse) {
            //회원가입코드 findOrCreate
            const queryCreateUser = `
              INSERT INTO User (email, password, nickname, role_type, create_at, modified_at)
              VALUES(?,?,?,?,NOW(),NOW())`;
            const [createUserResult] = (await pool.query(queryCreateUser, [
              email,
              tokenId,
              "",
              "2",
            ])) as any;
            if (user_id === undefined) user_id = createUserResult.insertId;
            return done(null, {
              tokenId,
              email,
              provider,
              user_id,
              isNew: true,
            });
          }
          // 이미 있는 계정이면..
          // 로그인을 시켜야겠지?
          return done(null, {
            tokenId,
            email,
            provider,
            user_id,
            isNew: false,
          });
        } catch (error: any) {
          return done(error);
        }
        //여기 있는 done은 serialize에서 받는다아이가!
      }
    )
  );

  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "googleId",
        session: true,
      },
      async (email, googleId, done): Promise<void> => {
        const pool = Container.get<mysql2.Pool>("pool");
        const provider = "google-local"; //프론트에서 구글, 백엔드에서 로컬
        try {
          const queryUserExist = "SELECT * FROM User WHERE email=(?)";
          const [userExistResult] = await pool.query(queryUserExist, [email]);
          const [userExistResultParse] = parseObject(userExistResult);
          let user_id = userExistResultParse?.user_id;

          // 회원가입절차 진행
          if (!userExistResultParse) {
            //회원가입코드 findOrCreate
            const queryCreateUser = `
              INSERT INTO User (email, password, nickname, role_type, create_at, modified_at)
              VALUES(?,?,?,?,NOW(),NOW())`;
            const [createUserResult] = await pool.query(queryCreateUser, [
              email,
              googleId,
              "",
              "2",
            ]);
            const createUserResultParse = parseObject(createUserResult);
            if (user_id === undefined) user_id = createUserResultParse.insertId;

            return done(null, {
              user_id,
              googleId,
              email,
              isNew: true,
            });
          }

          //이미 존재하는 계정의 경우, 로그인진행
          return done(null, { user_id, googleId, email, isNew: false });
        } catch (error: any) {
          return done(error);
        }
      }
    )
  );
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

// const queryUserExist = "SELECT * FROM User WHERE email=(?)";
// const [userExistResult] = await db.query(queryUserExist, [email]);
// const [userExistResultParse] = JSON.parse(
//   JSON.stringify(userExistResult)
// );
// if ( true === bycrypt.compareSync(password, userExistResultParse.password) ) {
