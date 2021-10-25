import { Container, Service, Inject } from "typedi";
import mysql2 from "mysql2/promise";
import config from "../config";
import { randomBytes } from "crypto";
import { Logger } from "winston";
import axios from "axios";
import KeywordService from "../services/keyword";

import { ICL } from "../interfaces/ICL";
// import fetch from "node-fetch";
import { IKeyword } from "../interfaces/IKeyword";
import { parseObject } from "../utils";

@Service()
export default class questionService {
  constructor(@Inject("logger") private logger: Logger) {}
  db = Container.get<mysql2.Pool>("db");

  // Q1 GET localhost:3001/api/questions
  // 키워드를 선택하고, 해당 키워드에 대한 질문리스트들을 뿌려줄때!
  public async questionList(
    user_keyword_id: number,
    user_id: number
  ): Promise<object> {
    let result = {} as any;

    //1. 키워드 읽음 요청
    const keywordServiceInstance = Container.get(KeywordService);
    const response = (await keywordServiceInstance.updateKeywordRead(
      user_keyword_id
    )) as any;
    result.isAnswerColUpdated = response.isUpdated;

    //2. 키워드에 대한 질문풀 저장 요청
    result.newCreatedUserQuestions = 0;
    if (result.isAnswerColUpdated == 1) {
      // 처음으로 키워드를 읽었다면
      const { keyword_id } = (await this.getKeywordIdByUserKeywordId(
        user_keyword_id
      )) as any;
      const userQuestionResult = await this.putUserQuestionsAfterCE(
        user_keyword_id,
        keyword_id
      );
      result.newCreatedUserQuestions = userQuestionResult;
    }

    //3. 키워드에 대한 질문 응답요청
    const queryQuestionInfo = `
      SELECT
      Q.question_id, Q.content, Q.type,
      UQ.user_question_id, UQ.answer,
      IF(EXISTS (SELECT * FROM Likes WHERE question_id = Q.question_id AND user_id = ?), true, false) AS liked,
      IF(EXISTS (SELECT * FROM Dislikes WHERE question_id = Q.question_id AND user_id = ?), true, false) AS disliked
      FROM Question Q
      INNER JOIN (SELECT * FROM UserQuestion WHERE user_keyword_id=?) UQ ON Q.question_id = UQ.question_id`;
    const [questionInfoResult] = (await this.db.query(queryQuestionInfo, [
      user_id,
      user_id,
      user_keyword_id,
    ])) as any;

    // //4. (이후) 자기소개서에서 어느부분에서 나왔는지에 대한 정보도 같이줘야된다

    result.questions = questionInfoResult;
    result.questions = result.questions.map((e: any) => ({
      ...e,
      liked: e.liked ? true : false,
      disliked: e.disliked ? true : false,
    }));

    return result;
  }

  private async getKeywordIdByUserKeywordId(
    user_keyword_id: number
  ): Promise<object> {
    const query = `
      SELECT keyword_id FROM UserKeyword WHERE user_keyword_id = ? LIMIT 1`;
    const [result] = (await this.db.query(query, [user_keyword_id])) as any;

    return result[0];
  }

  private async isQuestionDislikeUp(question_id: number, user_id: number) {
    const queryIsUp = `
      SELECT * FROM Dislikes WHERE question_id = ? AND user_id = ?`;
    const [queryIsUpResult] = (await this.db.query(queryIsUp, [
      question_id,
      user_id,
    ])) as any;
    if (queryIsUpResult.length == 0) return 0;
    else return 1;
  }

  private async isQuestionLikeUp(question_id: number, user_id: number) {
    const queryIsUp = `
      SELECT * FROM Likes WHERE question_id = ? AND user_id = ?`;
    const [queryIsUpResult] = (await this.db.query(queryIsUp, [
      question_id,
      user_id,
    ])) as any;
    if (queryIsUpResult.length == 0) return 0;
    else return 1;
  }

  // Q2 POST localhost:3001/api/questions/like
  // 특정 질문에 대해 좋아요를 남길때!
  public async questionLike(
    question_id: number,
    user_id: number
  ): Promise<object> {
    let result = {
      upLike: false,
      downDislike: false,
      deleted: false,
    } as any;

    // 좋아요 상태인지 싫어요 상태인지 가져오기
    const isUp = await this.isQuestionLikeUp(question_id, user_id);

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
      const queryLikeUpResultParse = parseObject(queryLikeUpResult);
      if (queryLikeUpResultParse.affectedRows === 1) result.upLike = true;

      // 그다음 싫어요를 down으로 바꾼다. 그냥 요청 2번날리기수법.
      const queryDislikeDown = `DELETE FROM Dislikes WHERE question_id=(?) AND user_id=(?)`;
      const [queryDislikeDownResult] = await this.db.query(queryDislikeDown, [
        question_id,
        user_id,
      ]);
      const queryDislikeDownResultParse = parseObject(queryDislikeDownResult);
      if (queryDislikeDownResultParse.affectedRows === 1)
        result.downDislike = true;
    } else if (isUp === 1) {
      // case2: 좋up, 싫down -> 좋down, 싫down : 좋아요 비활성화하고싶다.
      const queryLikeDown = `DELETE FROM Likes WHERE question_id=(?) AND user_id=(?)`;
      const [queryLikeDownResult] = await this.db.query(queryLikeDown, [
        question_id,
        user_id,
      ]);
      const queryLikeDownResultParse = parseObject(queryLikeDownResult);
      if (queryLikeDownResultParse.affectedRows === 1) result.deleted = true;
    }

    return result;
  }

  // Q3 POST localhost:3001/api/questions/dislike
  // 특정 질문에 대해 싫어요를 남길때!
  public async questionDislike(
    question_id: number,
    user_id: number
  ): Promise<object> {
    let result = {
      upDislike: false,
      downLike: false,
      deleted: false,
    } as any;

    const isUp = await this.isQuestionDislikeUp(question_id, user_id);

    if (isUp === 0) {
      //싫어요 활성화하고싶을때
      // case1: 좋down, 싫down OR 좋up, 싫down
      const queryDislikeUp = `
        INSERT IGNORE INTO Dislikes (question_id, user_id) VALUES (?, ?)`;
      const [queryDislikeUpResult] = await this.db.query(queryDislikeUp, [
        question_id,
        user_id,
      ]);
      const queryDislikeUpResultParse = parseObject(queryDislikeUpResult);
      if (queryDislikeUpResultParse.affectedRows === 1) result.upDislike = true;
      else result.message = "이런일은없어야하는데..";

      // 그다음 좋아요를 down으로 바꾼다. 그냥 요청 2번날리기수법.
      const queryLikeDown = `DELETE FROM Likes WHERE question_id=(?) AND user_id=(?)`;
      const [queryLikeDownResult] = await this.db.query(queryLikeDown, [
        question_id,
        user_id,
      ]);
      const queryLikeDownResultParse = parseObject(queryLikeDownResult);
      if (queryLikeDownResultParse.affectedRows === 1) result.downLike = true;
    } else if (isUp === 1) {
      // case2: 좋down, 싫up -> 좋down 싫down : 싫어요 비활성화하고싶다.
      const queryDislikeDown = `DELETE FROM Dislikes WHERE question_id=(?) AND user_id=(?)`;
      const [queryDislikeDownResult] = await this.db.query(queryDislikeDown, [
        question_id,
        user_id,
      ]);
      const queryDislikeDownResultParse = parseObject(queryDislikeDownResult);
      if (queryDislikeDownResultParse.affectedRows === 1) result.deleted = true;
    }
    return result;
  }

  // Q5 POST localhost:3001/api/questions/answer
  // 특정 질문에 대해 답하기!
  public async answerToQuestion(
    user_id: number,
    user_question_id: number,
    user_keyword_id: number,
    answer: string
  ): Promise<object> {
    let result = {} as any;

    //1. 질문에 답했으면 해당키워드 업데이트하기
    const keywordServiceInstance = Container.get(KeywordService);
    const response = (await keywordServiceInstance.updateKeywordAnswered(
      user_keyword_id
    )) as any;
    result.isAnswerColUpdated = response.isUpdated;

    //2. 질문에 대한 답변 DB에 넣기
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

    //3. 꼬리질문 생성하기
    let tailQuestion = await this.getKeywordsFromCE(user_id, answer);
    if (tailQuestion && tailQuestion !== "None") {
      result.tailQuestion = tailQuestion;
    }

    return result;
  }

  private async getKeywordsFromCE(userId: number, sentence: string) {
    //1. 답변을 코어엔진에게 키워드 추출 요청
    let res = await axios.post(`${config.ceServerURL}/ce/keywords`, {
      elements: JSON.stringify([sentence]),
    });

    let keywords: IKeyword[][] = JSON.parse(JSON.stringify(res.data));
    let keywordIds = keywords[0].map((k) => k.id); //임시로 첫번째 키워드만 가져옴

    let result = "None";

    // 2. UserKeyword 테이블에 방금 가져온 키워드와 겹치는 것을 가져옵니다.
    if (keywordIds.length > 0) {
      const queryQuestion =
        "SELECT Q.question_id, Q.content, Q.type FROM Question AS Q WHERE question_id IN (" +
        "SELECT question_id FROM KeywordsQuestions WHERE keyword_id IN (?) AND question_id NOT IN (" +
        "SELECT question_id FROM UserQuestion WHERE user_keyword_id IN (" +
        "SELECT user_keyword_id FROM UserKeyword WHERE user_id = ?)))";
      const [questionResult] = (await this.db.query(queryQuestion, [
        keywordIds,
        userId,
      ])) as any;

      if (questionResult && questionResult.length > 0) {
        result = questionResult[0];
      }
    }

    return result;
  }

  // 파이프라인 : 유저키워드에 따른 유저질문을 만들어준다.
  // 질문리스트를 요청하면 Q1에서 호출된다!
  private async putUserQuestionsAfterCE(
    user_keyword_id: number,
    keyword_id: number
  ) {
    //0. IF EXIST 구문을 이용해서 만약에 user_keyword_id에 대한 질문이 이미 존재하면 그만 하고 나가기!
    const queryExistCheck = `
      SELECT * FROM UserQuestion WHERE user_keyword_id = ? LIMIT 1`;
    const [queryExistCheckResult] = (await this.db.query(queryExistCheck, [
      user_keyword_id,
    ])) as any;
    if (queryExistCheckResult.length !== 0) return 0;

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
    const [queryMakeUserQuestionsResult] = (await this.db.query(
      queryMakeUserQuestions,
      [userQuestionsData]
    )) as any;

    return queryMakeUserQuestionsResult.affectedRows;
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
