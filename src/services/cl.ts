import { Container, Service, Inject } from "typedi";
import mysql2 from "mysql2/promise";
import config from "../config";
import { randomBytes } from "crypto";
import { Logger } from "winston";
import KeywordService from "../services/keyword";
import QuestionService from "../services/question";

import { ICL } from "../interfaces/ICL";
import { ICLElementNode } from "../interfaces/ICLElementNode";
import { addAbortSignal } from "stream";
import Connection from "mysql/lib/Connection";

@Service()
export default class CLService {
  //공용 함수들!
  constructor(@Inject("logger") private logger: Logger) {}
  parseObj = (o: any) => JSON.parse(JSON.stringify(o));
  db = Container.get<mysql2.Pool>("db");
  keywordServiceInstance = Container.get(KeywordService);
  questionServiceInstance = Container.get(QuestionService);

  private compareCLE(front: ICLElementNode, db: any) {
    if (front.problem == db.problem && front.answer == db.answer) return 1;
    else return 0;
  }

  // C1 POST localhost:3001/api/cls
  // 자기소개서항목 등록 & 수정 할때
  public async makeCLE(
    CLES: string,
    cl_id: number,
    user_id: number,
    title: string,
    company: string,
    tags: string,
    comments: string
  ): Promise<object> {
    let result = {} as any;
    // CLES 파싱
    let CLElements = JSON.parse(CLES);
    let answerDatas: any[] = [];
    const conenction = await this.db.getConnection();

    try {
      await conenction.beginTransaction(); // START TRANSACTION
      CLElements.map(async (cleFromFront: ICLElementNode) => {
        const queryExistCLE = `
        SELECT E.problem, E.answer FROM CLElement E WHERE E.cl_element_id = ? AND E.cl_id = ?`;
        const [cleFromDB] = (await conenction.query(queryExistCLE, [
          parseInt(cleFromFront.cl_element_id),
          cl_id,
        ])) as any;
        // 이미있는 자소서니까 UPDATE OR DoNothing
        if (cleFromDB.length > 0) {
          const isSameCLE = this.compareCLE(cleFromFront, cleFromDB[0]);
          // 수정된 자소서라면
          if (isSameCLE == 0) {
            answerDatas.push(cleFromFront.answer);
            // 업데이트 먼저 한다.
            const queryCLEUpdate = `
              UPDATE CLElement E SET E.problem=?, E.answer=?, E.modified_at=NOW() WHERE E.cl_element_id=? AND E.cl_id=?`;
            const queryResult = (await conenction.query(queryCLEUpdate, [
              cleFromFront.problem,
              cleFromFront.answer,
              cleFromFront.cl_element_id,
              cl_id,
            ])) as any;

            // 기존 데이터를 삭제한다.
          }
          // 그대로인 자소서라면
          else if (isSameCLE == 1) {
            // pass
          }
        }
        // 존재하지 않는 자소서니까 INSERT
        else {
          // 새로운 자소서 INSERT
          answerDatas.push(cleFromFront.answer);
          const queryCLEInsert = `
            INSERT INTO CLElement (cl_element_id, problem, answer, cl_id, public)
            VALUES (?,?,?,?,1)`;
          const queryResult = (await conenction.query(queryCLEInsert, [
            parseInt(cleFromFront.cl_element_id),
            cleFromFront.problem,
            cleFromFront.answer,
            cl_id,
          ])) as any;
        }
      });

      await conenction.commit(); // COMMIT
    } catch (err) {
      console.log("rollback");
      await conenction.rollback(); // ROLLBACK
    } finally {
      // 키워드 분석 새롭게 한다.
      if (answerDatas.length > 0) {
        const putKeywordsInfoAfterCEResult =
          (await this.keywordServiceInstance.putKeywordsInfoAfterCE(
            user_id,
            answerDatas
          )) as any;
      }
      await conenction.release();
    }
    return {
      result: 1,
    };
  }

  // C2 GET localhost:3001/api/cls
  // 자기소개서항목 & 주고받기 정보 내놓으라할때
  public async getCLEsById(user_id: number): Promise<object> {
    // 먼저, cl_id 관련된 정보가 있으면 불러오고 없으면 만든다.
    const { cl_id, isNew } = await this.getOrCreateCLId(user_id);
    const queryGetCLEs = `
      SELECT * FROM CLElement WHERE cl_id = ?`;
    const [queryGetCLEsResult] = await this.db.query(queryGetCLEs, [cl_id]);
    return { isNew: isNew, cl_id: cl_id, cles: queryGetCLEsResult };
  }

  private async getOrCreateCLId(user_id: any) {
    //디비를 거쳐서 cl_id를 가져온다.
    const { cl_id } = (await this.getCLIdFromUserId(user_id)) as any;

    //빈객체이면 유저의 cl_id정보를 만든다.
    if (cl_id == -1) {
      const personalityKeywordsResult =
        await this.keywordServiceInstance.putPersonalityKeywords(user_id);

      const queryClInitialize = `
        INSERT INTO CL (user_id, title, company, tags, comment, view_num, user_question_num, created_at)
        VALUES (?, "init", "init", "init", "init", 0, 0, NOW())`;
      const [queryClInitializeResult] = (await this.db.query(
        queryClInitialize,
        [user_id]
      )) as any;
      return {
        cl_id: queryClInitializeResult.insertId,
        isNew: 1,
        personalityKeywordsResult: personalityKeywordsResult,
      };
    } else {
      return { cl_id: cl_id, isNew: 0 };
    }
  }

  private async deleteAllCLERelated(
    cl_element_id: number,
    cl_id: number,
    user_id: number
  ) {
    const connection = await this.db.getConnection();
    try {
      await connection.beginTransaction(); // START TRANSACTION

      // 1. 키워드정보
      // user_id, cl_element_id
      const queryDeleteUserKeywords = `
      DELETE 
      FROM UserKeywords
      JOIN 
      WHERE cl_element_id=? AND user_id=?`;
      const [resultDeleteUserKeywords] = await connection.query(
        queryDeleteUserKeywords,
        [cl_element_id, user_id]
      );

      // 2. 질문정보
      const queryDeleteUserQuestions = `
      DELETE FROM UserQuestion WHERE user_id = ?`;
      const [resultDeleteUserQuestions] = await connection.query(
        queryDeleteUserKeywords,
        [cl_element_id, user_id]
      );

      await connection.commit(); // COMMIT
    } catch (err) {
      await connection.rollback(); // ROLLBACK
    } finally {
      await connection.release(); // RELEASE
    }

    // 3. FromCL정보
  }

  // C3 DELETE localhost:3001/api/cls
  // 자기소개서항목 삭제
  public async deleteCLE(
    cl_element_id: number,
    user_id: number
  ): Promise<object> {
    //디비를 거쳐서 cl_id를 가져온다.
    const { cl_id } = (await this.getCLIdFromUserId(user_id)) as any;

    let result = {} as any;

    const queryDeleteCLElement = `
        DELETE FROM CLElement WHERE cl_element_id=? AND cl_id=?`;
    const [queryDeleteCLElementResult] = await this.db.query(
      queryDeleteCLElement,
      [cl_element_id, cl_id]
    );
    const queryDeleteCLElementResultParse = this.parseObj(
      queryDeleteCLElementResult
    );
    if (queryDeleteCLElementResultParse.affectedRows === 1)
      result.isDeleted = true;
    else result.isDeleted = false;

    const queryRearrangeOrder = `
      UPDATE CLElement SET cl_element_id = cl_element_id - 1 WHERE cl_id = ? AND cl_element_id > ?`;
    const [queryRearrangeOrderResult] = await this.db.query(
      queryRearrangeOrder,
      [cl_id, cl_element_id]
    );
    return result;
  }

  private async getCLIdFromUserId(user_id: number) {
    const queryGetCLIdFromUserId = `
      SELECT cl_id FROM CL WHERE user_id = ? LIMIT 1`;
    const [queryGetCLIdFromUserIdResult] = (await this.db.query(
      queryGetCLIdFromUserId,
      [user_id]
    )) as any;

    if (queryGetCLIdFromUserIdResult.length == 0) return { cl_id: -1 };
    else return queryGetCLIdFromUserIdResult[0];
  }
}

// private makeClesDbFormat(CLES: any, cl_id: any) {
//     let elements = [] as any;
//     let rows = [] as any;
//     let pCLES = JSON.parse(CLES);
//     pCLES.map(
//       (CLE: {
//         cl_element_id: string;
//         problem: any;
//         answer: any;
//         _public: any;
//       }) => {
//         let row = [];
//         row.push(parseInt(CLE.cl_element_id));
//         row.push(CLE.problem);
//         row.push(CLE.answer);
//         row.push(parseInt(CLE._public));
//         row.push(cl_id);
//         rows.push(row);

//         elements.push(CLE.answer);
//       }
//     );
//     return { clesData: rows, answerData: elements };
//   }
