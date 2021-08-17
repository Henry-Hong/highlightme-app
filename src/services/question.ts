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

  // 특정 키워드에 대한 question 리스트를 받을때
  public async questionList(
    user_keyword_id: number
  ): Promise<{ token: object; content: object }> {
    const questionInfoResults = await this.getQuestionsInfo(user_keyword_id);

    if (!questionInfoResults) {
      console.log("질문목록 뽑아오기 실패!");
      return { token: {}, content: {} };
    }

    return {
      token: {},
      content: questionInfoResults,
    };
  }

  public async getQuestionsInfo(user_keyword_id: number): Promise<object> {
    const db = Container.get<mysql2.Connection>("db");
    const queryQuestionInfo =
      "SELECT * FROM Question WHERE question_id IN (SELECT question_id FROM UserQuestion WHERE user_keyword_id = (?))";
    const [questionInfoResult] = await db.query(queryQuestionInfo, [
      user_keyword_id,
    ]);

    return questionInfoResult;
  }

  //자기소개서항목 추가
  //자기소개서항목 삭제
}
