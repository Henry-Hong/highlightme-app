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
    keyword: string | undefined //이거 한국어 or 영어로 되어있을텐데 특별한처리가 필요하지않을까
  ): Promise<{ token: object }> {
    const db = Container.get<mysql2.Connection>("db");

    // question_ids 에 해당하는 정보를 배열형태로 불러오고싶다면?
    const question_ids = [1, 2, 3, 4, 5];

    const questionInfoResults = await this.getQuestionsInfo(question_ids);

    if (!questionInfoResults) {
      console.log("자기소개서문항 넣기 실패");
      // return { token: "fail!" };
    }

    return {
      token: questionInfoResults,
    };
  }

  public async getQuestionsInfo(question_ids: number[]): Promise<object> {
    const db = Container.get<mysql2.Connection>("db");
    console.log(question_ids);
    // const queryQuestionInfo = "SELECT * FROM Question WHERE question_id=(SELECT question_id FROM KeywordsQuestions WHERE keyword_id=[배열])";
    const queryQuestionInfo = "SELECT * FROM Question WHERE question_id IN (?)";
    const [questionInfoResult] = await db.query(queryQuestionInfo, [
      question_ids,
    ]);

    return questionInfoResult;
  }

  //자기소개서항목 추가
  //자기소개서항목 삭제
}
