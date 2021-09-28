import { Container, Service, Inject } from "typedi";
import mysql2 from "mysql2/promise";
import config from "../config";
import { randomBytes } from "crypto";
import { Logger } from "winston";

import { ICL } from "../interfaces/ICL";

@Service()
export default class CLService {
  constructor(@Inject("logger") private logger: Logger) {}
  parseObj = (o: any) => JSON.parse(JSON.stringify(o));
  //자기소개서항목 등록 & 수정 할때
  public async makeCLE(
    CLES: string,
    cl_id: number,
    user_id: number,
    title: string,
    company: string,
    tags: object,
    comments: string
  ): Promise<object> {
    const db = Container.get<mysql2.Connection>("db");

    //1. 자소서문항정보 삽입하기, 이미있으면 업데이트
    const queryCLElement = `
        INSERT INTO CLElement (cl_element_id, problem, answer, public, cl_id)
        VALUES ?
        ON DUPLICATE KEY UPDATE problem = VALUES(problem), answer = VALUES(answer), modified_at = NOW()`;
    const rows = this.makeRowsFromCLES(CLES, cl_id);
    const [clElementResult] = await db.query(queryCLElement, [rows]);

    //2. title, company, tags, comments 받아와서 저장하는부분

    return clElementResult;
  }

  private makeRowsFromCLES(CLES: any, cl_id: any) {
    let rows = [] as any;
    let pCLES = JSON.parse(CLES);
    pCLES.forEach((e: any) => {
      let row = Object.values(e);
      row.push(cl_id);
      rows.push(row);
    });
  }

  //자기소개서항목 추가
  //자기소개서항목 삭제
}
