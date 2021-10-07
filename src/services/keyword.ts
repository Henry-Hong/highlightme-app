import { Container, Service, Inject } from "typedi";
import mysql2 from "mysql2/promise";
import config from "../config";
import { Logger } from "winston";
import { IKeyword } from "../interfaces/IKeyword";
import axios from "axios";
import LoggerInstance from "../loaders/logger";

@Service()
export default class KeywordService {
  constructor(@Inject("logger") private logger: Logger) {}
  db = Container.get<mysql2.Connection>("db");
  parseObj = (o: any) => JSON.parse(JSON.stringify(o));

  // K1, K2 GET localhost:3001/api/keywords
  // 한 유저의 키워드를 불러오는 apis
  public async getUserKeywords(user_id: number): Promise<object> {
    try {
      const queryUserKeywords = `
        SELECT
        K.keyword_id, K.keyword,
        UK.user_keyword_id, UK.answered
        FROM Keyword K
        INNER JOIN (SELECT * FROM UserKeyword WHERE user_id = ? AND is_ready = 1) UK ON K.keyword_id = UK.keyword_id`;
      const [queryUserKeywordsResult] = (await this.db.query(
        queryUserKeywords,
        [user_id]
      )) as any;

      let keywords: {
        keyword_id: number;
        user_keyword_id: number;
        keyword: string;
        answered: number;
      }[] = [];
      for (let kw of queryUserKeywordsResult) {
        keywords.push({
          keyword_id: kw.keyword_id,
          user_keyword_id: kw.user_keyword_id,
          keyword: kw.keyword,
          answered: kw.answered,
        });
      }
      let result = { result: keywords };
      return result; //success
    } catch (error) {
      console.log(error);
      return { result: "error", message: error };
    }
  }

  // K3 POST localhost:3001/api/keywords/read
  // 한 키워드를 읽었음을 알리는 api
  public async updateKeywordRead(user_keyword_id: number): Promise<object> {
    try {
      const queryKeywordRead = `
        UPDATE UserKeyword SET answered = 1 WHERE user_keyword_id = ? AND answered = 0`;
      const [queryKeywordReadResult] = (await this.db.query(queryKeywordRead, [
        user_keyword_id,
      ])) as any;
      let result = { isUpdated: queryKeywordReadResult.affectedRows };

      return result;
    } catch (error) {
      console.log(error);
      return { result: "error", message: error };
    }
  }

  // K4 POST localhost:3001/api/keywords/answered
  // 한 키워드에 답변이 달렸음을 알리는 api
  public async updateKeywordAnswered(user_keyword_id: number): Promise<object> {
    try {
      const queryKeywordAnswer = `
        UPDATE UserKeyword SET answered = 2 WHERE user_keyword_id = ? AND answered = 1`;
      // answered = 0 인경우, 업데이트가 안될 수 있기에 조심! 항상 K3로 인해 answred = 1 로 바뀌고나서 실행된다는 시나리오!!
      const [queryKeywordAnswerResult] = (await this.db.query(
        queryKeywordAnswer,
        [user_keyword_id]
      )) as any;

      let result = { isUpdated: queryKeywordAnswerResult.affectedRows };

      return result;
    } catch (error) {
      console.log(error);
      return { result: "error", message: error };
    }
  }

  public async putKeywordsInfoAfterCE(
    user_id: number,
    elements: string
  ): Promise<number> {
    const db = Container.get<mysql2.Connection>("db");

    try {
      // 1. req: CLElements --(CoreEngine)--> res: keywordsData
      // const ceResult = await fetch(config.ceServerURL + "/keywords", {
      //   method: "GET",
      //   body: new URLSearchParams({
      //     elements: JSON.stringify([elements]),
      //   }),
      // });

      let ceResult = {} as any;
      await axios
        .post(config.ceServerURL + "/keywords", {
          elements: elements, //searchParams은 query같은데,,, body로 보내야되는거아닌가??
        })
        .then(function (response: any) {
          ceResult = response.data;
        })
        .catch(function (error) {
          throw error;
        });

      const data: IKeyword[][] = await ceResult.json(); //assuming data is json
      // const data = [
      //   [
      //     {
      //       rawKeyword: "DI",
      //       indices: [6],
      //       type: 1,
      //       id: 205,
      //       keyword: "종속성 주입",
      //     },
      //     {
      //       rawKeyword: "고등학교",
      //       indices: [14],
      //       type: 0,
      //     },
      //   ],
      //   [
      //     {
      //       rawKeyword: "abc",
      //       indices: [1, 2, 3],
      //       type: 1,
      //       id: 205,
      //       keyword: "ABc",
      //     },
      //     {
      //       rawKeyword: "abcd",
      //       indices: [5, 6, 7, 8],
      //       type: 0,
      //     },
      //     {
      //       rawKeyword: "abcde",
      //       indices: [9, 10, 11, 12, 13],
      //       type: 0,
      //     },
      //   ],
      // ];

      //1.5. (임시) 기존 테이블 내용 날리기
      // const queryDeleteAllRows = `DELETE FROM UserKeyword WHERE user_id = ?`;
      // const [result] = await db.query(queryDeleteAllRows, [user_id]);

      //2. UserKeyword 테이블에다가 keywordsData를 넣습니다.
      let keywordsData: any[] = [];
      let indices: any[] = [];
      data.forEach((keywords) => {
        let indices_cle: any[] = [];
        keywords.map((k) => {
          if (k.type === 1) {
            //실존하는 키워드만 넣음
            if (k.indices.length > 0) {
              indices_cle.push(k.indices);
            }
            keywordsData.push([k.id, user_id, false, true, true]);
          }
        });
        indices.push(indices_cle);
      });

      const queryUserkeyword = `
        INSERT INTO UserKeyword(keyword_id, user_id, answered, from_cl, is_ready)
        VALUES ?`;
      const [userKeywordResult] = (await db.query(queryUserkeyword, [
        keywordsData,
      ])) as any;
      let user_keyword_id: number = userKeywordResult.insertId;

      // //2. FromCL에 넣을 Indices 수집
      // //3. FromCL 테이블에 userKeywordResult.insertId를 이용해서 넣어야됨
      let indicesData = [] as any;
      let cl_element_id = 1;
      indices.forEach((keywords) => {
        keywords.map((K: any[]) => {
          K.map((k: any) => {
            indicesData.push([user_keyword_id, cl_element_id, k]);
          });
          user_keyword_id++;
        });
        cl_element_id++;
      });

      const queryIndicesToFromCL = `
      INSERT INTO FromCL(user_keyword_id, cl_element_id, cl_index)
      VALUES ?`;
      const [queryIndicesToFromCLResult] = await db.query(
        queryIndicesToFromCL,
        [indicesData]
      );

      return 1; //success
    } catch (error) {
      return 0;
    }
  }
}
