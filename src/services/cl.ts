import { Container, Service, Inject } from "typedi";
import mysql2 from "mysql2/promise";
import config from "../config";
import { randomBytes } from "crypto";
import { Logger } from "winston";

import { ICL } from "../interfaces/ICL";

@Service()
export default class CLService {
  constructor(@Inject("logger") private logger: Logger) {}

  //자기소개서항목 등록 & 수정 할때
  public async makeCLE(
    user_id: number, //토큰으로 대체될예정
    cl_element_id: number,
    problem: string,
    answer: string,
    _public: number //공개여부는 일단 무적권 1
  ): Promise<{ token: string }> {
    const db = Container.get<mysql2.Connection>("db");

    const queryCLElement = `
        INSERT INTO CLElement (cl_element_id, cl_id, problem, answer, public, modified_at, created_at)
        VALUES(?, 1, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE problem = problem, answer = answer, modified_at = NOW()`;

    const [clElementResult] = await db.query(queryCLElement, [
      cl_element_id,
      problem,
      answer,
      _public,
    ]);

    if (!clElementResult) {
      console.log("자기소개서문항 넣기 실패");
      return { token: "fail!" };
    }

    return { token: "success!" };
  }

  //자기소개서항목 추가
  //자기소개서항목 삭제
}
