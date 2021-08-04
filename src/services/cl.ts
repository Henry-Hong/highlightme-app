import { Container, Service, Inject } from "typedi";
import mysql2 from "mysql2/promise";
import config from "../config";
import { randomBytes } from "crypto";
import { Logger } from "winston";
import { nouns } from "mecab-ya";

import { ICL } from "../interfaces/ICL";

@Service()
export default class CLService {
  constructor(@Inject("logger") private logger: Logger) {}

  //자기소개서 등록할때
  public async makeCLE(
    user_id: number, //토큰으로 대체될예정
    cl_element_id: number,
    problem: string,
    answer: string,
    _public: number //공개여부는 일단 무적권 1
  ): Promise<{ token: string }> {
    //디비 인스턴스가져오기
    const db = Container.get<mysql2.Connection>("db");

    const queryCLElement =
      "INSERT INTO CLElement VALUES (?, ?, ?, ?, NOW(), NOW())";
    const [clElementResult] = await db.query(queryCLElement, [
      user_id, //user_id
      "", //comment
      0, //view_num
      0, //user_question_num
    ]);

    if (!clElementResult) {
      console.log("자기소개서문항 넣기 실패");
    }

    // User->CL->CLElement
    // cl_element_id에 해당하는 로우를 CLElment에서 찾기 : findOne
    //
    //

    const query = "SELECT * FROM User WHERE email = ?";
    const [user] = await db.query(query, [email]);

    // 데이터 넣어버리기!! ㅎㅎ

    return { token: "success!" };
  }

  //자기소개서항목 추가할때
  // 해당 used_id로 cl_element_id를 서버에서 새로만들고, return cl_element_id
  //자기소개서항목 삭제할때

  //자기소개서 수정할때
  //자기소개서 삭제할때
  //자기소게서
}
