import { Container, Service, Inject } from "typedi";
import mysql2 from "mysql2/promise";
import config from "../config";
import { Logger } from "winston";
import { IKeyword } from "../interfaces/IKeyword";
import axios from "axios";
import LoggerInstance from "../loaders/logger";
import QuestionService from "../services/question";
import { parseObject, isArrayEmpty } from "../utils";

@Service()
export default class KeywordService {
  constructor(@Inject("logger") private logger: Logger) {}
  pool = Container.get<mysql2.Pool>("pool");
  questionServiceInstance = Container.get(QuestionService);

  /**
   * K1 GET localhost:3001/api/keywords
   * 한 유저의 키워드를 불러오는 apis
   * @param user_id
   * @returns
   */
  public async getUserKeywords(user_id: number): Promise<object> {
    try {
      const queryUserKeywords = `
        SELECT
        K.keyword_id, K.keyword,
        UK.user_keyword_id, UK.answered
        FROM Keyword K
        INNER JOIN (SELECT * FROM UserKeyword WHERE user_id = ? AND is_ready = 1) UK ON K.keyword_id = UK.keyword_id`;
      const [queryUserKeywordsResult] = (await this.pool.query(
        queryUserKeywords,
        [user_id]
      )) as any;

      let keywords: {
        keyword_id: number;
        user_keyword_id: number;
        keyword: string;
        answered: number;
      }[] = [];
      for (let kw of queryUserKeywordsResult) {
        keywords.push({
          keyword_id: kw.keyword_id,
          user_keyword_id: kw.user_keyword_id,
          keyword: kw.keyword,
          answered: kw.answered,
        });
      }
      let result = { keywords: keywords };
      return result; //success
    } catch (error) {
      console.log(error);
      return { result: "error", message: error };
    }
  }

  /**
   * K2 POST localhost:3001/api/keywords/read
   * 한 키워드를 읽었음을 알리는 api
   * @param {number} userId
   * @param {number} keywordId
   * @returns {Boolean} DB 쿼리가 성공했는지 알려줌
   */
  public async updateKeywordRead(
    userId: number,
    keywordId: number
  ): Promise<{ isSuccess: Boolean; isKeywordStateNone?: Boolean }> {
    try {
      //answered 상태가 3가지이기 때문에 0번(무상태)일 때만 1번(읽은상태)로 바꿔주어야함
      //0: none, 1: read, 2: answered
      const queryKeywordRead = `
        UPDATE UserKeyword SET answered = 1 WHERE user_id = ? AND keyword_id = ? AND answered = 0`;
      const [result] = (await this.pool.query(queryKeywordRead, [
        userId,
        keywordId,
      ])) as any;

      return { isSuccess: true, isKeywordStateNone: result.affectedRows > 0 };
    } catch (error) {
      console.log(error);
      return { isSuccess: false };
    }
  }

  /**
   * K3 POST /keywords/answered
   * 한 키워드에 답변이 달렸음을 알리는 API
   * @param {number} userId
   * @param {number} keywordId
   * @returns {Boolean}
   */
  public async updateKeywordAnswered(
    userId: number,
    keywordId: number,
    conn?: mysql2.PoolConnection
  ): Promise<Boolean> {
    if (conn) {
      try {
        const queryKeywordAnswer = `
        UPDATE UserKeyword SET answered = 2 WHERE user_id = ? AND keyword_id = ?`;
        // answered = 0 인경우, 업데이트가 안될 수 있기에 조심! 항상 K3로 인해 answred = 1 로 바뀌고나서 실행된다는 시나리오!!
        const [queryKeywordAnswerResult] = (await conn.query(
          queryKeywordAnswer,
          [userId, keywordId]
        )) as any;

        // return queryKeywordAnswerResult.affectedRows > 0;
        return true;
      } catch (error) {
        console.log(error);
        return false;
      }
    } else {
      try {
        const queryKeywordAnswer = `
        UPDATE UserKeyword SET answered = 2 WHERE user_id = ? AND keyword_id = ?`;
        // answered = 0 인경우, 업데이트가 안될 수 있기에 조심! 항상 K3로 인해 answred = 1 로 바뀌고나서 실행된다는 시나리오!!
        const [queryKeywordAnswerResult] = (await this.pool.query(
          queryKeywordAnswer,
          [userId, keywordId]
        )) as any;

        // return queryKeywordAnswerResult.affectedRows > 0;
        return true;
      } catch (error) {
        console.log(error);
        return false;
      }
    }
  }

  /**
   * 자기소개서에서 키워드추출해서 DB에 세팅하는 함수
   * @param userId
   * @param elements
   * @returns {}
   */
  public async extractKeywordsThroughCE(
    userId: number,
    elements: string[]
  ): Promise<boolean> {
    try {
      // 0. 자소서에서 불필요한 특수문자 제거
      elements = this.rmUselessCharacters(elements);

      // 1. 코어엔진에게 키워드 추출 요청
      let ceResult: IKeyword[] = [];
      await axios
        .post(config.ceServerURL + "/ce/keywords", {
          elements: JSON.stringify(elements),
        })
        .then(function (response: any) {
          ceResult = parseObject(response.data);
        })
        .catch(function (error) {
          console.log("CE로 분석요청후 에러가났어욤");
          throw error;
        });
      // 만약 추출된 키워드가 없다면 DB 세팅할 필요없이 종료
      if (isArrayEmpty(ceResult)) return true;

      //2. 추출된 키워드를 UserKeyword와 FromCL에 세팅
      const conn = await this.pool.getConnection();
      try {
        await conn.beginTransaction(); // START TRANSACTION

        ceResult.forEach(async (k: IKeyword) => {
          //2-1. 유저키워드를 테이블에 넣고, 삽입되었을때의 insertId를 가져온다.
          const userKeywordId = await this.insertUserKeyword(conn, k, userId);

          //2-2. 키워드 인덱스를 insertId를 이용해 테이블에 넣는다.
          for (const indexInfo of k.indices) {
            // keywordInfo : [elementIndex, clIndex, length]
            const query = `INSERT INTO FromCL(user_keyword_id, cl_element_id, cl_index, length) VALUES (?,?,?,?)`;
            await conn.query(query, [
              userKeywordId,
              indexInfo[0] + 1, //elementIndex
              indexInfo[1], //clIndex
              indexInfo[2], //length
            ]);
          }
        });
        await conn.commit(); // COMMIT
      } catch (err) {
        await conn.rollback(); // ROLLBACK
      } finally {
        await conn.release();
        return true;
      }
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  private async insertUserKeyword(
    connection: mysql2.PoolConnection,
    k: IKeyword,
    userId: number
  ): Promise<number> {
    const query = `INSERT INTO UserKeyword(keyword_id, user_id, answered, from_cl, is_ready) VALUES (?,?,?,?,?)`;
    const [result] = (await connection.query(query, [
      k.id,
      userId,
      false,
      true,
      true,
    ])) as any;
    return result.insertId;
  }

  private rmUselessCharacters(elements: string[]) {
    return elements.map((e) =>
      e
        .replace("\n", " ")
        .replace("\r", " ")
        .replace('"', " ")
        .replace("'", " ")
        .replace("{", " ")
        .replace("}", " ")
        .replace("(", " ")
        .replace(")", " ")
        .replace("[", " ")
        .replace("]", " ")
    );
  }

  public async putPersonalityKeywords(user_id: number) {
    const queryPersonalityKeywords = `
        INSERT INTO UserKeyword(keyword_id, user_id, answered, from_cl, is_ready)
        VALUES ?`;
    const personalityKeywordsData = this.getPersonalityKeywordsData(user_id);
    const [queryPersonalityKeywordsResult] = (await this.pool.query(
      queryPersonalityKeywords,
      [personalityKeywordsData]
    )) as any;
    return queryPersonalityKeywordsResult.message;
  }

  private getPersonalityKeywordsData(user_id: number) {
    let rows = [
      [2271, user_id, 0, 0, 1],
      [2280, user_id, 0, 0, 1],
      [2289, user_id, 0, 0, 1],
      [2306, user_id, 0, 0, 1],
      [2312, user_id, 0, 0, 1],
      [2317, user_id, 0, 0, 1],
      [2336, user_id, 0, 0, 1],
    ];
    return rows;
  }
}
// {
//   "indices": [
//    [0, 3],
// 	  [33, 5],
// 	  [49, 5],
//   ],
//   "id": 1007,
//   "keyword": "React"
// },

// const data = [
//   [
//     {
//       rawKeyword: "DI",
//       indices: [6],
//       type: 1,
//       id: 205,
//       keyword: "종속성 주입",
//     },
//     {
//       rawKeyword: "고등학교",
//       indices: [14],
//       type: 0,
//     },
//   ],
//   [
//     {
//       rawKeyword: "abc",
//       indices: [1, 2, 3],
//       type: 1,
//       id: 205,
//       keyword: "ABc",
//     },
//     {
//       rawKeyword: "abcd",
//       indices: [5, 6, 7, 8],
//       type: 0,
//     },
//     {
//       rawKeyword: "abcde",
//       indices: [9, 10, 11, 12, 13],
//       type: 0,
//     },
//   ],
// ];

// let elements = [`스레드. 고등학교 동아리에서 처음 개발을 접했습니다. 안드로이드 앱을 만들어보며 내가 작성한 코드 대로 화면이 전환되는 모습에 흥미를 느꼈습니다. 시험기간이 끝날때마다 안드로이드 개발을 잘하던 친구와 함께 학교 정보를 제공하는 앱을 개발했습니다. 학교 홈페이지에 올라오는 식단 정보를 파싱해서 화면에 띄우는 작업을 했는데, 안드로이드에선 네트워크 작업을 비동기 프로세스로 처리해야만 했습니다. 동기와 비동기에 대한 지식이 부족했지만 밤을 새워가며 ASyncTask를 이용해 개발했습니다. 나중에 대학교 저학년 때 코틀린이 처음 도입되면서 Coroutine 이라는 개념을 배워 비동기 작업에 대한 처리를 개선해서 업데이트하기도 했습니다. 대학교에 진학하고 자연스레 모바일 앱 개발 동아리에 합류하여 여러가지 프로젝트를 진행했습니다. 첫번째로는 패션 정보를 추천 서비스 프로젝트에 안드로이드 개발을 담당했습니다. 백엔드 개발자가 따로 없었기 때문에 Firebase를 활용해서 Database를 사용했습니다. Firebase Firestore 특성상 안드로이드에서 직접 DB를 제어해야했습니다. 피드를 구현하는 과정에서 Not In 쿼리를 필요로 했는데, 당시 Firestore에는 해당 기능을 제공하고 있지 않았습니다. 고민 끝에 안드로이드에 Room을 활용한 Local DB를 따로 두는 방법으로 문제를 해결했습니다. 이 프로젝트에서 처음 Kotlin을 도입해보기도 했고 다양한 라이브러리를 활용하며 개발하는 방법을 배웠습니다. 두번째로는 블랙박스 영상을 공유 서비스를 만들었습니다. 선배의 도움으로 MVP, MVVM과 같은 아키텍처의 개념에 대해 배우고 처음으로 앱 개발에 적용해보았습니다. AAC의 View Binding, ViewModel 등의 기능을 통해 MVVM 설계를 적용해보았고, 각 컴포넌트의 역할을 확실히 구분하게 되면서 테스트도 간단하고 명료해졌습니다. 영상 공유 서버와 연결하는 컴포넌트에서는 성능 저하 이슈가 발생하여 다중 Thread로 작업을 나누었고 그 결과 10초 이상 걸리던 연결 시간이 평균 500ms로 감소시키는데 성공했습니다. 개발에 있어서 설계와 최적화의 중요성을 깊이 깨달을 수 있던 경험이었습니다.`];

// let ceResult: IKeyword[] = [
//   {
//     id: 1007,
//     keyword: "React",
//     rawKeyword: "리액트",
//     indices: {
//       "1": [
//         [10, 5],
//         [20, 5],
//         [30, 5],
//       ],
//       "2": [
//         [40, 5],
//         [50, 5],
//         [60, 5],
//       ],
//       "3": [
//         [70, 5],
//         [80, 5],
//         [90, 5],
//       ],
//     },
//     type: 0,
//   },
//   {
//     id: 1008,
//     keyword: "Vue.js",
//     rawKeyword: "뷰",
//     indices: {
//       "1": [
//         [11, 5],
//         [21, 5],
//       ],
//     },
//     type: 0,
//   },
//   {
//     id: 1009,
//     keyword: "Redux",
//     rawKeyword: "리덕스",
//     indices: {
//       "1": [[12, 5]],
//     },
//     type: 0,
//   },
// ];
