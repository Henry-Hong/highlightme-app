import { Container, Service, Inject } from "typedi";
import mysql2 from "mysql2/promise";
import config from "../config";
import { randomBytes } from "crypto";
import { Logger } from "winston";
import KeywordService from "./keyword";
import QuestionService from "./question";

import { ICL } from "../interfaces/ICL";
import { addAbortSignal } from "stream";

@Service()
export default class ScrapService {
  //공용 함수들!
  constructor(@Inject("logger") private logger: Logger) {}
  parseObj = (o: any) => JSON.parse(JSON.stringify(o));
  pool = Container.get<mysql2.Pool>("pool");
  // keywordServiceInstance = Container.get(KeywordService);
  // questionServiceInstance = Container.get(QuestionService);

  //S0 POST /api/scraps
  //특정질문 스크랩하기
  public async scrapQuestion(
    user_chain_question_id: number,
    user_question_id: number,
    question_id: number,
    user_id: number
  ): Promise<object> {
    let result = {} as any;
    console.log("hi?2");

    const queryScrapQuestion = `
      INSERT INTO Scrap (user_chain_question_id, user_question_id, question_id, user_id)
      VALUES (?,?,?,?)`;
    const [resultScrapQuestion] = (await this.pool.query(queryScrapQuestion, [
      user_chain_question_id,
      user_question_id,
      question_id,
      user_id,
    ])) as any;

    result.insertId = resultScrapQuestion.insertId;

    return result;
  }

  //S1 POST /api/scraps
  //특정질문 스크랩하기
  public async getScrapList(user_id: number): Promise<object> {
    let result = {} as any;
    const conenction = await this.pool.getConnection();

    try {
      await conenction.beginTransaction();

      const queryScrapFromUQ = `
        SELECT S.*, UQ.answer FROM Scrap S
        JOIN UserQuestion UQ on S.user_question_id = UQ.user_question_id WHERE user_id=?`;
      const [resultScrapFromUQ] = (await this.pool.query(queryScrapFromUQ, [
        user_id,
      ])) as any;

      const queryScrapFromUCQ = `
        SELECT S.*, UCQ.answer FROM Scrap S
        JOIN UserChainQuestion UCQ on S.user_chain_question_id = UCQ.user_chain_question_id WHERE user_id=?`;
      const [resultScrapFromUCQ] = (await this.pool.query(queryScrapFromUCQ, [
        user_id,
      ])) as any;

      await conenction.commit(); // COMMIT
      result.scrap_items = resultScrapFromUQ;
    } catch (err) {
      await conenction.rollback(); // ROLLBACK
    } finally {
      await conenction.release();
    }

    return result;
  }
}

// try {
//   await this.db.beginTransaction(); // START TRANSACTION

//   await this.db.commit(); // COMMIT
// } catch (err) {
//   await this.db.rollback(); // ROLLBACK
// } finally {
//   await this.db.release();
// }
