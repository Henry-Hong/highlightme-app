import { Container, Service, Inject } from "typedi";
import mysql2 from "mysql2/promise";
import config from "../config";
import { Logger } from "winston";

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

  // K4 POST localhost:3001/api/keywords/answered ㄱ-
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
    answer: string,
    cl_element_id: number
  ): Promise<number> {
    try {
      //1. ce야 내가 자소서 보내줄테니까 키워드 목록 보내줘! ->이제 node서버가 클라이언트가 되는거고, ce서버가 서버가되는거임.
      const ceResult = await fetch(config.ceServerURL + "/keywords", {
        method: "GET",
        body: new URLSearchParams({
          elements: JSON.stringify([answer]),
        }),
      });
      const data: any[] = await ceResult.json(); //assuming data is json
      // const data = [
      //   {
      //     id: 1, //keyword_id
      //     index: 1004, //index in CL element
      //     type: 0, //0: main, 1: related, 2: custom
      //   },
      //   {
      //     id: 2,
      //     index: 486,
      //     type: 0, //type이 전부다 main 이라는 가정하에,,, ㅎㅎ
      //   },
      // ];

      //2. UserKeyword 테이블에다가 키워드를 넣습니다.
      const db = Container.get<mysql2.Connection>("db");

      let rows: any[] = [];
      data.forEach((keyword) => {
        let row = [];
        row.push(keyword.id);
        row.push(2); //row.push(user_id);
        row.push(0); //answered, 0은상수 -> 상수관리는 나중에 알아보도록.. ㅠ
        row.push(1); //fromcl
        row.push(1); //is_ready

        rows.push(row);
      });
      const queryUserkeyword = `
        INSERT INTO UserKeyword(keyword_id, user_id, answered, from_cl, is_ready)
        VALUES ?`;
      const [userKeywordResult] = (await db.query(queryUserkeyword, [
        rows,
      ])) as any;

      //3. FromCL 테이블에 userKeywordResult.insertId를 이용해서 넣어야됨
      let rows2: any[] = [];

      for (let e = 0; e < data.length; e++) {
        let row = [];
        row.push(userKeywordResult.insertId + e);
        row.push(cl_element_id);
        row.push(data[e].index);

        rows2.push(row);
      }

      const queryFromCL = `
      INSERT INTO FromCL(user_keyword_id, cl_element_id, cl_index)
      VALUES ?`;
      const [fromClResult] = await db.query(queryFromCL, [rows2]);

      return 1; //success
    } catch (error) {
      console.log(error);
      return 0;
    }
  }
}
