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
import {
  iDbQuestionToIQuestion,
  getRandomInt,
  parseObject,
} from "../utils/index";
import { IDbQuestion } from "../interfaces/IDbQuestion";

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
   * Q7 GET /api/questions/scrapped
   * 키워드를 선택하면 해당하는 질문 목록과 그 질문들에 대한 사용자의 상태(좋아요, 싫어요 등)을 함께 보낸다
   * @param {number} userId
   * @param {number} keywordId
   * @returns {Promise<[statusCode: number, questions?: IQuestion[]]>}
   */
  public async loadScrappedQuestions(
    userId: number
  ): Promise<[statusCode: number, questions?: IQuestion[]]> {
    let userQuestions = await this.getScrappedUserQuestions(userId);
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

    return result.map(iDbQuestionToIQuestion);
  }

  /**
   * 해당 유저가 갖고 있는 모든 질문 관련 정보를 가져옴
   * @param {number} userId
   * @param {number[]} questionIds
   * @returns {IQuestion[]}
   */
  private async getScrappedUserQuestions(userId: number): Promise<IQuestion[]> {
    const query = `
      SELECT Q.question_id id, Q.content, UQ.answer, UQ.liked, UQ.disliked, UQ.scrapped, UQ.interview_listed interviewListed
      FROM Question Q
      INNER JOIN UserQuestion UQ ON Q.question_id = UQ.question_id
      WHERE UQ.user_id = ? AND scrapped = 1`;
    let [result] = (await this.pool.query(query, [userId])) as any;

    return result.map(iDbQuestionToIQuestion);
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
   * Q3 POST /api/questions/dislike
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
   * Q4 POST /api/questions/scrap
   * 특정 질문에 대한 스크랩 처리
   * @param userId
   * @param questionId
   * @returns {number} 성공 여부
   */
  public async scrapQuestion(
    userId: number,
    questionId: number
  ): Promise<number> {
    const query = `
        UPDATE UserQuestion SET scrapped = !scrapped WHERE user_id = ? AND question_id = ?`;
    const [result] = (await this.pool.query(query, [
      userId,
      questionId,
    ])) as any;

    return result.affectedRows > 0 ? 200 : 400;
  }

  /**
   * Q6 POST /api/questions/interviewListed
   * 특정 질문에 대한 모의면접 후보 등록 처리
   * @param userId
   * @param questionId
   * @returns {number} 성공 여부
   */
  public async interviewListQuestion(
    userId: number,
    questionId: number
  ): Promise<number> {
    const query = `
        UPDATE UserQuestion SET interview_listed = !interview_listed WHERE user_id = ? AND question_id = ?`;
    const [result] = (await this.pool.query(query, [
      userId,
      questionId,
    ])) as any;

    return result.affectedRows > 0 ? 200 : 400;
  }

  private async getKeywordIds(
    conn: mysql2.PoolConnection,
    questionId: number
  ): Promise<number[]> {
    const query = `SELECT keyword_id FROM KeywordsQuestions WHERE question_id = ?`;
    const [keywordIds] = (await conn.query(query, [questionId])) as any;
    return keywordIds.map((e: any) => e.keyword_id);
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
    answer: string
  ): Promise<[statusCode: number, result?: IQuestion]> {
    const keywordServiceInstance = Container.get(KeywordService);
    const conn = await this.pool.getConnection();
    let tailQuestion;

    try {
      await conn.beginTransaction(); // START TRANSACTION

      const keywordIds = await this.getKeywordIds(conn, questionId);

      //1. 질문에 답했으면 해당키워드 업데이트하기
      for (let keywordId of keywordIds) {
        const isKeywordAnsweredUpdated =
          await keywordServiceInstance.updateKeywordAnswered(
            userId,
            keywordId,
            conn
          );
        if (!isKeywordAnsweredUpdated) return [400, undefined]; //Error Check
      }

      //2. 질문에 대한 답변 DB에 넣기
      const queryAnswerToQuestion = `
       UPDATE UserQuestion SET answer = ?, modified_at = NOW() WHERE user_id = ? AND question_id = ?`;
      const [queryAnswerToQuestionResult] = (await conn.query(
        queryAnswerToQuestion,
        [answer, userId, questionId]
      )) as any;
      if (!queryAnswerToQuestionResult.affectedRows) return [400, undefined]; //Error Check

      //3. 꼬리질문 생성하기
      tailQuestion = await this.getTailQuestion(conn, userId, answer);
      await conn.commit(); // COMMIT
    } catch (err) {
      await conn.rollback(); // ROLLBACK
    } finally {
      await conn.release();
    }

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

    let keywords: IKeyword[] = parseObject(res.data);
    //cles 요청이었기 때문에 첫번째 항목만 담겨서 올것임
    if (keywords && keywords[0]) return keywords;
    else return undefined;
  }

  /**
   * Get tail question from the sentence
   * @param userId
   * @param sentence
   * @returns Promise<IQuestion | undefined>
   */
  private async getTailQuestion(
    conn: mysql2.PoolConnection,
    userId: number,
    sentence: string
  ): Promise<IQuestion | undefined> {
    try {
      //1. 답변을 코어엔진에게 키워드 추출 요청
      const keywords = await this.getKeywordsThroughCE(sentence);
      if (!keywords) return undefined; //Error Check
      let keywordIds = keywords.map((k) => k.id);

      // 2. UserKeyword 테이블에 방금 가져온 키워드와 겹치는 것을 가져옵니다.
      const queryGetTailQ = `
      SELECT Q.question_id id, T.keyword_id keywordId, Q.content FROM Question Q INNER JOIN (
        SELECT question_id, keyword_id FROM KeywordsQuestions WHERE keyword_id IN (?) AND question_id NOT IN (
        SELECT question_id FROM UserQuestion WHERE user_id = ?)) T ON Q.question_id = T.question_id
        ORDER BY RAND() LIMIT 1`;
      const [result] = (await conn.query(queryGetTailQ, [
        keywordIds,
        userId,
      ])) as any;

      if (!result) return undefined;

      let tailQuestion = iDbQuestionToIQuestion(result[0]);
      tailQuestion.keywordId = result[0].keywordId;

      // 3. tailQuestion을 UserQuestion으로 등록합니다!
      const queryInsertTailQ = `INSERT INTO UserQuestion (user_id, question_id, answer) VALUES (?, ?, "")`;
      await conn.query(queryInsertTailQ, [userId, tailQuestion.id]);

      return tailQuestion;
    } catch (error) {
      throw error;
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
   * removeExistingQuestions
   * @param userId
   * @param newQuestionIds
   * @returns
   */
  private async removeExistingQuestions(
    userId: number,
    newQuestionIds: number[]
  ): Promise<number[]> {
    // 꼬리질문에 의해 이미 생성된 질문이 있을 수 있음.
    // 일단은 존재하는 모든 질문풀에서 필터링하도록 개발.
    const query = `SELECT UQ.question_id FROM UserQuestion AS UQ WHERE UQ.user_id = ?`;
    const [result] = (await this.pool.query(query, [userId])) as any;

    const existingQuestionIds = result.map((e: any) => e.question_id);

    let filteredQuestionIds: number[] = [];
    newQuestionIds.forEach((newQuestionId: number) => {
      let isNotDuplicated = true;
      for (let id of existingQuestionIds) {
        if (newQuestionId === id) {
          isNotDuplicated = false;
          break;
        }
      }
      if (isNotDuplicated) filteredQuestionIds.push(newQuestionId);
    });

    return filteredQuestionIds;
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
      // 만약에 이미 있는 questionIds 라면 제외시켜야됨. (꼬리질문으로 생성되었을경우)
      questionIds = await this.removeExistingQuestions(userId, questionIds);
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
