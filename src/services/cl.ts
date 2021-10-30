import { Container, Service, Inject } from "typedi";
import mysql2 from "mysql2/promise";
import config from "../config";
import { randomBytes } from "crypto";
import { Logger } from "winston";
import KeywordService from "../services/keyword";
import QuestionService from "../services/question";

import { ICL } from "../interfaces/ICL";
import { ICLElement } from "../interfaces/ICLElement";
import { addAbortSignal } from "stream";
import Connection from "mysql/lib/Connection";
import { parseObject } from "../utils";

@Service()
export default class CLService {
  //공용 함수들!
  constructor(@Inject("logger") private logger: Logger) {}
  pool = Container.get<mysql2.Pool>("pool");
  keywordServiceInstance = Container.get(KeywordService);
  questionServiceInstance = Container.get(QuestionService);

  /**
   * C1 POST localhost:3001/api/cls
   * 자기소개서항목 등록 & 수정 할때
   * @param elements
   * @param userId
   * @param title
   * @param company
   * @param tags
   * @param comments
   * @returns
   */
  public async makeCLE(
    elements: string,
    userId: number,
    title: string,
    company: string,
    tags: string,
    comments: string
  ): Promise<number> {
    const connection = await this.pool.getConnection();
    const clId = await this.getOrCreateCLId(userId);

    let clesFromFront = JSON.parse(elements);
    let toBeKeywordExtracted: string[] = [];

    try {
      await connection.beginTransaction(); // START TRANSACTION

      // 프론트에서 요청받은 자기소개서 문항을 3가지로 분류한다.
      // 1. 이미 존재하고 && 수정되지않은 자소서
      // 2. 이미 존재하고 && 수정된 자소서 -> 새롭게 키워드 추출
      // 3. 새로운 자소서 -> 새롭게 키워드 추출
      for (let [idx, cleFromFront] of clesFromFront.entries()) {
        const clElementId = idx + 1;
        const cleFromDB = await this.getExistingCLE(
          connection,
          clElementId,
          clId
        );

        // 이미있는 자소서니까 UPDATE OR DoNothing
        if (cleFromDB !== undefined) {
          const isSameCLE = this.compareCLE(cleFromFront, cleFromDB);
          // 수정된 자소서라면
          if (isSameCLE === true) {
            // 새롭게 추출될 자기소개서문항을 저장.
            toBeKeywordExtracted.push(cleFromFront.answer);

            // 기존 자소서 수정.
            const isSucesss = await this.updateExistingCLE(
              connection,
              cleFromFront,
              clElementId,
              clId
            );
            if (!isSucesss) return 500;

            // 기존 데이터를 삭제한다.
          }
          // 그대로인 자소서라면
          else if (isSameCLE === false) {
            // pass
          }
        }
        // 존재하지 않는 자소서니까 INSERT
        else {
          // 새롭게 추출될 자기소개서문항을 저장.
          toBeKeywordExtracted.push(cleFromFront.answer);

          // 새로운 자소서 삽입.
          const isSuccess = await this.insertNewCLE(
            connection,
            cleFromFront,
            clElementId,
            clId
          );
          if (!isSuccess) return 500;
        }
      }

      await connection.commit(); // COMMIT
    } catch (err) {
      console.log("rollback processed when cl upload while transactioning");
      await connection.rollback(); // ROLLBACK
      return 500;
    } finally {
      // 추출할게 있는경우에만 CE로 키워드 분석 요청
      if (toBeKeywordExtracted.length > 0) {
        try {
          //나중에 이렇게 바궈야할듯
          const isSuccess =
            await this.keywordServiceInstance.extractKeywordsThroughCE(
              userId,
              toBeKeywordExtracted
            );
          if (!isSuccess) return 500;
        } catch (error) {
          throw error;
        }

        await connection.release();
      }
      // 추출할게 없는 경우는
      else {
        // do nothing
      }
      return 200;
    }
  }

  private compareCLE(front: ICLElement, db: any) {
    if (front.problem == db.problem && front.answer == db.answer) return true;
    else return false;
  }

  private async getExistingCLE(
    conn: mysql2.PoolConnection,
    clElementId: number,
    clId: number
  ) {
    const query = `SELECT E.problem, E.answer FROM CLElement E WHERE E.cl_element_id = ? AND E.cl_id = ?`;
    const [result] = (await conn.query(query, [clElementId, clId])) as any;
    return result[0];
  }

  private async updateExistingCLE(
    connection: mysql2.PoolConnection,
    cle: ICLElement,
    clElementId: number,
    clId: number
  ): Promise<boolean> {
    try {
      const query = `
        UPDATE CLElement AS E SET E.problem = ?, E.answer = ?, E.modified_at = NOW()
        WHERE E.cl_element_id = ? AND E.cl_id = ?`;
      await connection.query(query, [
        cle.problem,
        cle.answer,
        clElementId,
        clId,
      ]);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async insertNewCLE(
    connection: mysql2.PoolConnection,
    cle: ICLElement,
    clElementId: number,
    clId: number
  ): Promise<boolean> {
    try {
      const query = `
        INSERT INTO CLElement (cl_element_id, problem, answer, cl_id, public) VALUES (?,?,?,?,1)`;
      await connection.query(query, [
        clElementId,
        cle.problem,
        cle.answer,
        clId,
      ]);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * C2 GET localhost:3001/api/cls
   * 자기소개서항목 & 주고받기 정보 내놓으라할때
   * @param userId
   * @returns
   */
  public async getElements(userId: number): Promise<object> {
    // 1. GET clId from userId
    const clId = await this.getOrCreateCLId(userId);

    // 2. GET elements from clId
    const queryElements = `SELECT problem, answer, public as _public FROM CLElement WHERE cl_id = ?`;
    let [elements] = (await this.pool.query(queryElements, [clId])) as any;
    // 변환작업
    elements = elements.map((e: any) => {
      e._public = e._public ? true : false;
      return e;
    });

    // 3. GET 주고받기정보 from CL table
    const queryUserCL = `
      SELECT title, company, tags, comments FROM CL WHERE user_id = ?`;
    const [userCL] = (await this.pool.query(queryUserCL, [userId])) as any;
    const CL: ICL = parseObject(userCL[0]);

    return {
      elements: elements,
      company: CL.company,
      title: CL.title,
      tags: CL.tags,
      comments: CL.comments,
    };
  }

  private async getOrCreateCLId(userId: any) {
    // 사용자의 clId를 받아온다.
    const clId = await this.getCLIdFromUserId(userId);

    // clId가 없으면 유저의 clId정보를 만든다.
    if (!clId) {
      // 새롭게 만들어서 리턴한다.
      const query = `
        INSERT INTO CL (user_id, title, company, tags, comments, view_num, user_question_num, created_at)
        VALUES (?, "init", "init", "init", "init", 0, 0, NOW())`;
      const [result] = (await this.pool.query(query, [userId])) as any;
      return result.insertId;
    } else {
      return clId;
    }
  }

  /**
   * C3 DELETE localhost:3001/api/cls
   * 자기소개서항목 삭제
   * @param index
   * @param userId
   * @returns
   */
  public async deleteCLE(index: number, userId: number): Promise<number> {
    // 1. get clId
    const clId = await this.getCLIdFromUserId(userId);

    // 2-1. delete coverletter element
    const queryDelete = `DELETE FROM CLElement WHERE cl_element_id = ? AND cl_id = ?`;
    const [resultDelete] = (await this.pool.query(queryDelete, [
      index,
      clId,
    ])) as any;
    if (resultDelete.affectedRows === 0) return 400;

    // 2-2. arrange order of exsting elements
    const queryRearrangeCLE = `UPDATE CLElement SET cl_element_id = cl_element_id - 1 WHERE cl_id = ? AND cl_element_id > ?`;
    const [resultRearrange] = (await this.pool.query(queryRearrangeCLE, [
      clId,
      index,
    ])) as any;
    if (resultRearrange.affectedRows === 0) return 400;

    // 3. element 삭제 -> user keyword[] 삭제 -> fromCL[] 삭제
    // 근데 user keyword 를 삭제하는 과정이 복잡. 비정규화로 가고싶구나~

    return 200;
  }

  private async getCLIdFromUserId(userId: number): Promise<number> {
    const query = `
      SELECT cl_id FROM CL WHERE user_id = ? LIMIT 1`;
    const [result] = (await this.pool.query(query, [userId])) as any;
    // 없으면 return clId = 0
    let clId = 0;
    return result.length === 0 ? (clId = 0) : (clId = result[0].cl_id);
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
