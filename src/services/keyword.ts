import { Container, Service, Inject } from "typedi";
import mysql2 from "mysql2/promise";
import config from "../config";
import { Logger } from "winston";
import { IKeyword } from "../interfaces/IKeyword";
import axios from "axios";
import LoggerInstance from "../loaders/logger";
import QuestionService from "../services/question";
import { parseObject, isArrayEmpty } from "../utils";

@Service()
export default class KeywordService {
  constructor(@Inject("logger") private logger: Logger) {}
  pool = Container.get<mysql2.Pool>("pool");
  questionServiceInstance = Container.get(QuestionService);

  /**
   * K1 GET localhost:3001/api/keywords
   * 한 유저의 키워드를 불러오는 apis
   * @param userId
   * @returns
   */
  public async getUserKeywords(
    userId: number
  ): Promise<[statusCode: number, keywords?: IKeyword[]]> {
    try {
      const query = `
        SELECT
        K.keyword_id as keywordId, K.keyword,
        UK.answered
        FROM Keyword K
        INNER JOIN (SELECT * FROM UserKeyword WHERE user_id = ? AND is_ready = 1) UK ON K.keyword_id = UK.keyword_id`;
      const [result] = (await this.pool.query(query, [userId])) as any;

      // 만약 아무런 유저키워드가 없다면,
      if (isArrayEmpty(result)) {
        const isSuccess = await this.putPersonalityKeywords(userId);
        if (!isSuccess) return [500];
        return [201, result]; // new contents created!
      }

      return [200, result]; //success
    } catch (error) {
      console.log(error);
      return [500]; //fail
    }
  }

  /**
   * K2 POST localhost:3001/api/keywords/read
   * 한 키워드를 읽었음을 알리는 api
   * @param {number} userId
   * @param {number} keywordId
   * @returns {Boolean} DB 쿼리가 성공했는지 알려줌
   */
  public async updateKeywordRead(
    userId: number,
    keywordId: number
  ): Promise<{ isSuccess: Boolean; isKeywordStateNone?: Boolean }> {
    try {
      //answered 상태가 3가지이기 때문에 0번(무상태)일 때만 1번(읽은상태)로 바꿔주어야함
      //0: none, 1: read, 2: answered
      const queryKeywordRead = `
        UPDATE UserKeyword SET answered = 1 WHERE user_id = ? AND keyword_id = ? AND answered = 0`;
      const [result] = (await this.pool.query(queryKeywordRead, [
        userId,
        keywordId,
      ])) as any;

      return { isSuccess: true, isKeywordStateNone: result.affectedRows > 0 };
    } catch (error) {
      console.log(error);
      return { isSuccess: false };
    }
  }

  /**
   * K3 POST /keywords/answered
   * 한 키워드에 답변이 달렸음을 알리는 API
   * @param {number} userId
   * @param {number} keywordId
   * @returns {Boolean}
   */
  public async updateKeywordAnswered(
    userId: number,
    keywordId: number,
    conn?: mysql2.PoolConnection
  ): Promise<Boolean> {
    if (conn) {
      try {
        const queryKeywordAnswer = `
          UPDATE UserKeyword SET answered = 2 WHERE user_id = ? AND keyword_id = ?`;
        // answered = 0 인경우, 업데이트가 안될 수 있기에 조심! 항상 K3로 인해 answred = 1 로 바뀌고나서 실행된다는 시나리오!!
        const [queryKeywordAnswerResult] = (await conn.query(
          queryKeywordAnswer,
          [userId, keywordId]
        )) as any;

        // return queryKeywordAnswerResult.affectedRows > 0;
        return true;
      } catch (error) {
        console.log(error);
        return false;
      }
    } else {
      try {
        const queryKeywordAnswer = `
          UPDATE UserKeyword SET answered = 2 WHERE user_id = ? AND keyword_id = ?`;
        // answered = 0 인경우, 업데이트가 안될 수 있기에 조심! 항상 K3로 인해 answred = 1 로 바뀌고나서 실행된다는 시나리오!!
        const [queryKeywordAnswerResult] = (await this.pool.query(
          queryKeywordAnswer,
          [userId, keywordId]
        )) as any;

        // return queryKeywordAnswerResult.affectedRows > 0;
        return true;
      } catch (error) {
        console.log(error);
        return false;
      }
    }
  }

  /**
   * 자기소개서에서 키워드추출해서 DB에 세팅하는 함수
   * @param userId
   * @param elements
   * @returns {}
   */
  public async extractKeywordsThroughCE(
    userId: number,
    elements: string[]
  ): Promise<boolean> {
    try {
      // 0. 자소서에서 불필요한 특수문자 제거
      elements = this.rmUselessCharacters(elements);

      // 1. 코어엔진에게 키워드 추출 요청
      let ceResult: IKeyword[] = [];
      await axios
        .post(config.ceServerURL + "/ce/keywords", {
          elements: JSON.stringify(elements),
        })
        .then(function (response: any) {
          ceResult = parseObject(response.data);
        })
        .catch(function (error) {
          console.log("CE로 분석요청후 에러가났어욤");
          throw error;
        });
      // 만약 추출된 키워드가 없다면 DB 세팅할 필요없이 종료
      if (isArrayEmpty(ceResult)) return true;

      //2. 추출된 키워드를 UserKeyword와 FromCL에 세팅
      const conn = await this.pool.getConnection();
      try {
        await conn.beginTransaction(); // START TRANSACTION

        ceResult.forEach(async (k: IKeyword) => {
          //2-1. 유저키워드를 테이블에 넣고, 삽입되었을때의 insertId를 가져온다.
          const userKeywordId = await this.insertUserKeyword(conn, k, userId);

          //2-2. 키워드 인덱스를 insertId를 이용해 테이블에 넣는다.
          if (k.indices === undefined) return false;
          for (const indexInfo of k.indices) {
            // keywordInfo : [elementIndex, clIndex, length]
            const query = `INSERT INTO FromCL(user_keyword_id, cl_element_id, cl_index, length) VALUES (?,?,?,?)`;
            await conn.query(query, [
              userKeywordId,
              indexInfo[0] + 1, //elementIndex
              indexInfo[1], //clIndex
              indexInfo[2], //length
            ]);
          }
        });
        await conn.commit(); // COMMIT
      } catch (err) {
        await conn.rollback(); // ROLLBACK
      } finally {
        await conn.release();
        return true;
      }
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  /**
   * 서브함수 of extractKeywordsThroughCE
   * 추출된 키워드를 유저키워드 테이블에 삽입
   * @param connection
   * @param k
   * @param userId
   * @returns {insertId}
   */
  private async insertUserKeyword(
    connection: mysql2.PoolConnection,
    k: IKeyword,
    userId: number
  ): Promise<number> {
    const query = `INSERT INTO UserKeyword(keyword_id, user_id, answered, from_cl, is_ready) VALUES (?,?,?,?,?)`;
    const [result] = (await connection.query(query, [
      k.id,
      userId,
      false,
      true,
      true,
    ])) as any;
    return result.insertId;
  }

  /**
   * 서브함수 of extractKeywordsThroughCE
   * 자기소개서문항에서 특수문자들 이스케이프처리해주는함수
   * @param elements
   * @returns
   */
  private rmUselessCharacters(elements: string[]) {
    return elements.map((e) =>
      e
        .replace("\n", " ")
        .replace("\r", " ")
        .replace('"', " ")
        .replace("'", " ")
        .replace("{", " ")
        .replace("}", " ")
        .replace("(", " ")
        .replace(")", " ")
        .replace("[", " ")
        .replace("]", " ")
    );
  }

  public async putPersonalityKeywords(userId: number): Promise<boolean> {
    try {
      const query = `
      INSERT INTO UserKeyword(keyword_id, user_id, answered, from_cl, is_ready)
      VALUES ?`;
      const data = this.getPersonalityKeywordsData(userId);
      await this.pool.query(query, [data]);
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  private getPersonalityKeywordsData(userId: number) {
    return [
      [2271, userId, 0, 0, 1],
      [2280, userId, 0, 0, 1],
      [2289, userId, 0, 0, 1],
      [2306, userId, 0, 0, 1],
      [2312, userId, 0, 0, 1],
      [2317, userId, 0, 0, 1],
      [2336, userId, 0, 0, 1],
    ];
  }
}
