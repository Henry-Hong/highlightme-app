import { Container, Service, Inject } from "typedi";
import mysql2 from "mysql2/promise";
import config from "../config";
import { randomBytes } from "crypto";
import { Logger } from "winston";
import axios from "axios";
import KeywordService from "../services/keyword";

import { ICL } from "../interfaces/ICL";
import { IQuestion } from "../interfaces/IQuestion";
import { IKeyword } from "../interfaces/IKeyword";
import { getRandomInt, parseObject } from "../utils/index";

@Service()
export default class questionService {
  constructor(@Inject("logger") private logger: Logger) {}
  pool = Container.get<mysql2.Pool>("pool");

  /**
   * Q1 GET /api/questions
   * 키워드를 선택하면 해당하는 질문 목록과 그 질문들에 대한 사용자의 상태(좋아요, 싫어요 등)을 함께 보낸다
   * @param {number} userId
   * @param {number} keywordId
   * @returns {Promise<[statusCode: number, questions?: IQuestion[]]>}
   */
  public async loadQuestions(
    userId: number,
    keywordId: number
  ): Promise<[statusCode: number, questions?: IQuestion[]]> {
    //1. 키워드 읽음 요청
    const keywordServiceInstance = Container.get(KeywordService);
    const { isSuccess, isKeywordStateNone } =
      await keywordServiceInstance.updateKeywordRead(userId, keywordId);
    if (!isSuccess) return [500, undefined]; //Error Check

    //2. keywordId에 해당하는 모든 questionIds 로딩
    const questionIds = await this.getQuestionIdsFromKeywordId(keywordId);

    //3. 처음으로 키워드를 읽었다면 모든 questionIds 저장
    if (isKeywordStateNone) {
      const isSuccess = await this.setUserQuestions(userId, questionIds);
      if (!isSuccess) return [500, undefined]; //Error Check
    }

    //3. 사용자의 질문 정보 가져옴
    let userQuestions = await this.getUserQuestions(userId, questionIds);
    return [200, userQuestions];
  }

  /**
   * 해당 유저가 갖고 있는 모든 질문 관련 정보를 가져옴
   * @param {number} userId
   * @param {number[]} questionIds
   * @returns {IQuestion[]}
   */
  private async getUserQuestions(
    userId: number,
    questionIds: number[]
  ): Promise<IQuestion[]> {
    const query = `
      SELECT Q.question_id id, Q.content, UQ.answer, UQ.liked, UQ.disliked, UQ.scrapped, UQ.interview_listed interviewListed
      FROM Question Q
      INNER JOIN UserQuestion UQ ON Q.question_id = UQ.question_id
      WHERE UQ.user_id = ? AND UQ.question_id IN (?)`;
    let [result] = (await this.pool.query(query, [userId, questionIds])) as any;

    // //4. (이후) 자기소개서에서 어느부분에서 나왔는지에 대한 정보도 같이줘야된다
    result = result.map((e: any) => {
      return <IQuestion>{
        id: e.id,
        content: e.content,
        answer: e.answer,
        actions: {
          liked: e.liked ? true : false,
          disliked: e.disliked ? true : false,
          scrapped: e.scrapped ? true : false,
          interviewListed: e.interviewListed ? true : false,
        },
      };
    });

    return result;
  }

  private async getKeywordIdByUserKeywordId(
    user_keyword_id: number
  ): Promise<object> {
    const query = `
      SELECT keyword_id FROM UserKeyword WHERE user_keyword_id = ? LIMIT 1`;
    const [result] = (await this.pool.query(query, [user_keyword_id])) as any;

    return result[0];
  }

  /**
   * Q2 POST /api/questions/like
   * 특정 질문에 대한 좋아요 처리
   * @param userId
   * @param questionId
   * @returns {number} 성공 여부
   */
  public async likeQuestion(
    userId: number,
    questionId: number
  ): Promise<number> {
    const query = `
        UPDATE UserQuestion SET liked = !liked, disliked = 0 WHERE user_id = ? AND question_id = ?`;
    const [result] = (await this.pool.query(query, [
      userId,
      questionId,
    ])) as any;

    return result.affectedRows > 0 ? 200 : 400;
  }

  /**
   * Q2 POST /api/questions/dislike
   * 특정 질문에 대한 싫어요 처리
   * @param userId
   * @param questionId
   * @returns {number} 성공 여부
   */
  public async dislikeQuestion(
    userId: number,
    questionId: number
  ): Promise<number> {
    const query = `
        UPDATE UserQuestion SET disliked = !disliked, liked = 0 WHERE user_id = ? AND question_id = ?`;
    const [result] = (await this.pool.query(query, [
      userId,
      questionId,
    ])) as any;

    return result.affectedRows > 0 ? 200 : 400;
  }

  /**
   * Q5 POST /api/questions/answer
   * 특정 질문에 대해 답하기
   * @param {number} userId
   * @param {number} questionId
   * @param {string} answer
   * @returns Promise<[statusCode: number, result?: IQuestion]>
   */
  public async answerQuestion(
    userId: number,
    questionId: number,
    keywordId: number,
    answer: string
  ): Promise<[statusCode: number, result?: IQuestion]> {
    //1. userId + keywordId로 해당하는 userKeywordId 찾기
    const querySelectUserKeywordId = `
      SELECT user_keyword_id AS userKeywordId FROM UserKeyword
      WHERE user_id = ? AND keyword_id = ? LIMIT 1`;
    const [selectUserKeywordIdResult] = (await this.pool.query(
      querySelectUserKeywordId,
      [userId, keywordId]
    )) as any;
    let userKeywordId = selectUserKeywordIdResult[0].userKeywordId;

    //1. 질문에 답했으면 해당키워드 업데이트하기
    const keywordServiceInstance = Container.get(KeywordService);
    const isKeywordAnsweredUpdated =
      await keywordServiceInstance.updateKeywordAnswered(userKeywordId);
    if (!isKeywordAnsweredUpdated) return [400, undefined]; //Error Check

    //2. 질문에 대한 답변 DB에 넣기
    const queryAnswerToQuestion = `
      UPDATE UserQuestion SET answer = ?, modified_at = NOW() WHERE user_id = ? AND question_id = ?`;
    const [queryAnswerToQuestionResult] = (await this.pool.query(
      queryAnswerToQuestion,
      [answer, userId, questionId]
    )) as any;
    if (!queryAnswerToQuestionResult.affectedRows) return [400, undefined]; //Error Check

    //3. 꼬리질문 생성하기
    let tailQuestion = await this.getTailQuestion(userId, answer);
    if (tailQuestion) {
      return [200, tailQuestion];
    } else {
      return [204, undefined];
    }
  }

  /**
   * Get keywords from sentence through CE
   * @param sentence
   * @returns {IKeyword[]}
   */
  private async getKeywordsThroughCE(
    sentence: string
  ): Promise<IKeyword[] | undefined> {
    //답변을 코어엔진에게 키워드 추출 요청
    let res = await axios.post(`${config.ceServerURL}/ce/keywords`, {
      elements: JSON.stringify([sentence]),
    });

    let keywords: IKeyword[][] = parseObject(res.data);
    if (keywords && keywords[0] && keywords[0].length > 0) {
      return keywords[0]; //cles 요청이었기 때문에 첫번째 항목만 담겨서 올것임
    } else {
      return undefined;
    }
  }

  /**
   * Get tail question from the sentence
   * @param userId
   * @param sentence
   * @returns Promise<IQuestion | undefined>
   */
  private async getTailQuestion(
    userId: number,
    sentence: string
  ): Promise<IQuestion | undefined> {
    //1. 답변을 코어엔진에게 키워드 추출 요청
    const keywords = await this.getKeywordsThroughCE(sentence);
    if (!keywords) return undefined; //Error Check
    let keywordIds = keywords.map((k) => k.id);

    // 2. UserKeyword 테이블에 방금 가져온 키워드와 겹치는 것을 가져옵니다.
    const queryQuestion = `
      SELECT Q.question_id questionId, T.keyword_id keywordId, Q.content FROM Question Q INNER JOIN (
        SELECT question_id, keyword_id FROM KeywordsQuestions WHERE keyword_id IN (?) AND question_id NOT IN (
        SELECT question_id FROM UserQuestion WHERE user_id = ?)) T ON Q.question_id = T.question_id`;
    const [questionResult] = (await this.pool.query(queryQuestion, [
      keywordIds,
      userId,
    ])) as any;

    if (questionResult && questionResult.length > 0) {
      const randomIndex = getRandomInt(0, questionResult.length);
      const result: IQuestion = questionResult[randomIndex];
      return result;
    } else {
      return undefined;
    }
  }

  private async getQuestionIdsFromKeywordId(
    keywordId: number
  ): Promise<number[]> {
    const query = `
      SELECT question_id FROM KeywordsQuestions WHERE keyword_id = ?`;
    const [result] = (await this.pool.query(query, [keywordId])) as any;
    return result.map((row: any) => row.question_id);
  }

  /**
   * 질문리스트를 사용자별 UserQuestion에 저장한다.
   * @param userId
   * @param questionIds
   * @returns {Boolean} 성공 여부
   */
  private async setUserQuestions(
    userId: number,
    questionIds: number[]
  ): Promise<Boolean> {
    try {
      const formattedUserQuestions = questionIds.map((questionId) => [
        userId,
        questionId,
      ]);
      const queryMakeUserQuestions = `
      INSERT INTO UserQuestion (user_id, question_id)
      VALUES ?`;
      const [queryMakeUserQuestionsResult] = (await this.pool.query(
        queryMakeUserQuestions,
        [formattedUserQuestions]
      )) as any;

      return true;
    } catch (error) {
      console.log(error);

      return false;
    }
  }
}
