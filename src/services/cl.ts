import { Container, Service, Inject } from "typedi";
import mysql2 from "mysql2/promise";
import config from "../config";
import { randomBytes } from "crypto";
import { Logger } from "winston";
import KeywordService from "../services/keyword";
import QuestionService from "../services/question";

import { ICL } from "../interfaces/ICL";
import { addAbortSignal } from "stream";

@Service()
export default class CLService {
  //공용 함수들!
  constructor(@Inject("logger") private logger: Logger) {}
  parseObj = (o: any) => JSON.parse(JSON.stringify(o));
  db = Container.get<mysql2.Connection>("db");
  keywordServiceInstance = Container.get(KeywordService);
  questionServiceInstance = Container.get(QuestionService);

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
    //1. 자소서문항정보 삽입, 이미있으면 업데이트
    const queryCLElement = `
        INSERT INTO CLElement (cl_element_id, problem, answer, public, cl_id)
        VALUES ?
        ON DUPLICATE KEY UPDATE modified_at = IF(problem <> VALUES(problem) OR answer <> VALUES(answer), NOW(), modified_at), problem = VALUES(problem), answer = VALUES(answer)`;
    const { clesData, answerData } = this.makeClesDbFormat(CLES, cl_id);
    const [clElementResult] = (await this.db.query(queryCLElement, [
      clesData,
    ])) as any;

    //2. 주고받기 정보(title, company, tags, comments) 받아와서 저장하는부분

    //3. 자소서정보를 CE서버로 보내서 키워드 분석하는부분
    const putKeywordsInfoAfterCEResult =
      (await this.keywordServiceInstance.putKeywordsInfoAfterCE(
        user_id,
        answerData
      )) as any;

    return {
      cl_upload_info: clElementResult.affectedRows,
      after_ce_info_keyword: putKeywordsInfoAfterCEResult.userKeyword,
      after_ce_info_indexes: putKeywordsInfoAfterCEResult.userIndexes,
    };
  }

  private makeClesDbFormat(CLES: any, cl_id: any) {
    let elements = [] as any;
    let rows = [] as any;
    let pCLES = JSON.parse(CLES);
    pCLES.map(
      (CLE: {
        cl_element_id: string;
        problem: any;
        answer: any;
        _public: any;
      }) => {
        let row = [];
        row.push(parseInt(CLE.cl_element_id));
        row.push(CLE.problem);
        row.push(CLE.answer);
        row.push(parseInt(CLE._public));
        row.push(cl_id);
        rows.push(row);

        elements.push(CLE.answer);
      }
    );
    return { clesData: rows, answerData: elements };
  }

  // C2 GET localhost:3001/api/cls
  // 자기소개서항목 & 주고받기 정보 내놓으라할때
  public async getCLEsById(user_id: number): Promise<object> {
    // 먼저, cl_id 관련된 정보가 있으면 불러오고 없으면 만든다.
    const { cl_id, isNew } = await this.getOrCreateCLId(user_id);
    const queryGetCLEs = `
      SELECT * FROM CLElement WHERE cl_id = ?`;
    const [queryGetCLEsResult] = await this.db.query(queryGetCLEs, [cl_id]);
    return { isNew: isNew, cl_id: cl_id, result: queryGetCLEsResult };
  }

  private async getOrCreateCLId(user_id: any) {
    //디비를 거쳐서 cl_id를 가져온다.
    const { cl_id } = (await this.getCLIdFromUserId(user_id)) as any;

    //빈객체이면 유저의 cl_id정보를 만든다.
    if (cl_id == -1) {
      const queryClInitialize = `
        INSERT INTO CL (user_id, title, company, tags, comment, view_num, user_question_num, created_at)
        VALUES (?, "init", "init", "init", "init", 0, 0, NOW())`;
      const [queryClInitializeResult] = (await this.db.query(
        queryClInitialize,
        [user_id]
      )) as any;
      return { cl_id: queryClInitializeResult.insertId, isNew: 1 };
    } else {
      return { cl_id: cl_id, isNew: 0 };
    }
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
