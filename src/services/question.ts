import { Container, Service, Inject } from "typedi";
import mysql2 from "mysql2/promise";
import config from "../config";
import { randomBytes } from "crypto";
import { Logger } from "winston";
import axios from "axios";
import KeywordService from "../services/keyword";

import { ICL } from "../interfaces/ICL";

@Service()
export default class questionService {
  constructor(@Inject("logger") private logger: Logger) {}
  db = Container.get<mysql2.Connection>("db");
  parseObj = (e: any) => JSON.parse(JSON.stringify(e));

  // Q1 GET localhost:3001/api/questions
  // 키워드를 선택하고, 해당 키워드에 대한 질문리스트들을 뿌려줄때!
  public async questionList(user_keyword_id: number): Promise<object> {
    let result = {} as any;

    //1. 키워드에 접속하는 순간, 읽었음을 알리는 요청을 날린다.
    const keywordServiceInstance = Container.get(KeywordService);
    const response = (await keywordServiceInstance.updateKeywordRead(
      user_keyword_id
    )) as any;
    result.isAnswerColUpdated = response.isUpdated;

    //2. 선택한 키워드의 질문들을 뽑아내준다.
    const queryQuestionInfo = `
      SELECT
      Q.question_id, Q.content, Q.type,
      UQ.user_question_id
      FROM Question Q 
      INNER JOIN (SELECT * FROM UserQuestion WHERE user_keyword_id=?) UQ ON Q.question_id = UQ.question_id`;
    // "SELECT * FROM Question WHERE question_id IN (SELECT question_id FROM UserQuestion WHERE user_keyword_id = (?))";
    const [questionInfoResult] = (await this.db.query(queryQuestionInfo, [
      user_keyword_id,
    ])) as any;

    //3. (이후) 자기소개서에서 어느부분에서 나왔는지에 대한 정보도 같이줘야된다

    result.questions = questionInfoResult;
    return result;
  }

  // Q2 POST localhost:3001/api/questions/like
  // 특정 질문에 대해 좋아요를 남길때!
  public async questionLike(
    question_id: number,
    isUp: number,
    user_id: number
  ): Promise<object> {
    let result = {
      upLike: false,
      downDislike: false,
      deleted: false,
    } as any;
    if (isUp === 0) {
      //좋아요활성화하고싶을때
      // case1: 좋down, 싫down OR 좋down, 싫up -> 좋up
      // 일단 좋아요를 up으로 바꾼다.
      const queryLikeUp = `
        INSERT IGNORE INTO Likes (question_id, user_id) VALUES (?, ?)`;
      const [queryLikeUpResult] = await this.db.query(queryLikeUp, [
        question_id,
        user_id,
      ]);
      const queryLikeUpResultParse = this.parseObj(queryLikeUpResult);
      if (queryLikeUpResultParse.affectedRows === 1) result.upLike = true;

      // 그다음 싫어요를 down으로 바꾼다. 그냥 요청 2번날리기수법.
      const queryDislikeDown = `DELETE FROM Dislikes WHERE question_id=(?) AND user_id=(?)`;
      const [queryDislikeDownResult] = await this.db.query(queryDislikeDown, [
        question_id,
        user_id,
      ]);
      const queryDislikeDownResultParse = this.parseObj(queryDislikeDownResult);
      if (queryDislikeDownResultParse.affectedRows === 1)
        result.downDislike = true;
    } else if (isUp === 1) {
      // case2: 좋up, 싫down -> 좋down, 싫down : 좋아요 비활성화하고싶다.
      const queryLikeDown = `DELETE FROM Likes WHERE question_id=(?) AND user_id=(?)`;
      const [queryLikeDownResult] = await this.db.query(queryLikeDown, [
        question_id,
        user_id,
      ]);
      const queryLikeDownResultParse = this.parseObj(queryLikeDownResult);
      if (queryLikeDownResultParse.affectedRows === 1) result.deleted = true;
    }

    return result;
  }

  // Q3 POST localhost:3001/api/questions/dislike
  // 특정 질문에 대해 싫어요를 남길때!
  public async questionDislike(
    question_id: number,
    isUp: number,
    user_id: number
  ): Promise<object> {
    let result = {
      upDislike: false,
      downLike: false,
      deleted: false,
    } as any;
    if (isUp === 0) {
      //싫어요 활성화하고싶을때
      // case1: 좋down, 싫down OR 좋up, 싫down
      const queryDislikeUp = `
        INSERT IGNORE INTO Dislikes (question_id, user_id) VALUES (?, ?)`;
      const [queryDislikeUpResult] = await this.db.query(queryDislikeUp, [
        question_id,
        user_id,
      ]);
      const queryDislikeUpResultParse = this.parseObj(queryDislikeUpResult);
      if (queryDislikeUpResultParse.affectedRows === 1) result.upDislike = true;
      else result.message = "이런일은없어야하는데..";

      // 그다음 좋아요를 down으로 바꾼다. 그냥 요청 2번날리기수법.
      const queryLikeDown = `DELETE FROM Likes WHERE question_id=(?) AND user_id=(?)`;
      const [queryLikeDownResult] = await this.db.query(queryLikeDown, [
        question_id,
        user_id,
      ]);
      const queryLikeDownResultParse = this.parseObj(queryLikeDownResult);
      if (queryLikeDownResultParse.affectedRows === 1) result.downLike = true;
    } else if (isUp === 1) {
      // case2: 좋down, 싫up -> 좋down 싫down : 싫어요 비활성화하고싶다.
      const queryDislikeDown = `DELETE FROM Dislikes WHERE question_id=(?) AND user_id=(?)`;
      const [queryDislikeDownResult] = await this.db.query(queryDislikeDown, [
        question_id,
        user_id,
      ]);
      const queryDislikeDownResultParse = this.parseObj(queryDislikeDownResult);
      if (queryDislikeDownResultParse.affectedRows === 1) result.deleted = true;
    }
    return result;
  }

  // Q5 POST localhost:3001/api/questions/answer
  // 특정 질문에 대해 답하기!
  public async answerToQuestion(
    user_question_id: number,
    user_keyword_id: number,
    answer: string
  ): Promise<object> {
    let result = {} as any;

    //1. 질문에 답을 했다는거슨.. 어떤 키워드에 답을 하나라도 했다는것..
    const keywordServiceInstance = Container.get(KeywordService);
    const response = (await keywordServiceInstance.updateKeywordAnswered(
      user_keyword_id
    )) as any;
    result.isAnswerColUpdated = response.isUpdated;

    const queryAnswerToQuestion = `
      INSERT INTO UserQuestion (user_question_id, answer, created_at, modified_at)
      VALUES(?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE answer = VALUES(answer), modified_at = NOW()`;
    const [queryAnswerToQuestionResult] = (await this.db.query(
      queryAnswerToQuestion,
      [user_question_id, answer]
    )) as any;
    if (queryAnswerToQuestionResult.affectedRows) result.isAnswerSuccess = 1;
    else result.isAnswerSuccess = 0;

    return result;
  }

  // Q6 파이프라인 : 유저키워드에 따른 유저질문을 만들어준다.
  public async putUserQuestionsAfterCE(
    user_keyword_id: number,
    keyword_id: number
  ) {
    // 해당 유저의 키워드와 관련된 질문을 KeywordsQuestions에서 뽑아서
    // UserQuestion 테이블에 넣는다. -> 언제만 해야됨? (일단은 자소서를 등록했을때)
    // 1. KeywordsQuestions 테이블에서 keyword_id를 통해서 question_id 를 뽑아낸다.
    const queryKeywordQuestionPairs = `
      SELECT * FROM KeywordsQuestions WHERE keyword_id = ?`;
    const [queryKeywordQuestionPairsResult] = (await this.db.query(
      queryKeywordQuestionPairs,
      [keyword_id]
    )) as any;

    // 2. UserQuestion 테이블에 question_id를 바탕으로, user_keyword_id를 기본으로 하여 추가한다
    const queryMakeUserQuestions = `
      INSERT INTO UserQuestion (user_keyword_id, question_id)
      VALUES ?`;
    const { userQuestionsData } = await this.makeUserQuestionsDbFormat(
      queryKeywordQuestionPairsResult,
      user_keyword_id
    );

    const [queryMakeUserQuestionsResult] = await this.db.query(
      queryMakeUserQuestions,
      [userQuestionsData]
    );
    return queryMakeUserQuestionsResult;
  }

  private async makeUserQuestionsDbFormat(
    queryKeywordQuestionPairsResult: any,
    user_keyword_id: number
  ) {
    const rows = [] as any;
    queryKeywordQuestionPairsResult.map((row: any) =>
      rows.push([user_keyword_id, row.question_id])
    );
    return { userQuestionsData: rows };
  }
}
