import { Container, Service, Inject } from "typedi";
import mysql2 from "mysql2/promise";
import config from "../config";
import { Logger } from "winston";
import { IKeyword } from "../interfaces/IKeyword";
import axios from "axios";
import LoggerInstance from "../loaders/logger";
import QuestionService from "../services/question";
import { parseObject } from "../utils";

@Service()
export default class KeywordService {
  constructor(@Inject("logger") private logger: Logger) {}
  pool = Container.get<mysql2.Pool>("pool");
  questionServiceInstance = Container.get(QuestionService);

  // K1 GET localhost:3001/api/keywords
  // 한 유저의 키워드를 불러오는 apis
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

  // K2 POST localhost:3001/api/keywords/read
  // 한 키워드를 읽었음을 알리는 api
  public async updateKeywordRead(user_keyword_id: number): Promise<object> {
    try {
      const queryKeywordRead = `
        UPDATE UserKeyword SET answered = 1 WHERE user_keyword_id = ? AND answered = 0`;
      const [queryKeywordReadResult] = (await this.pool.query(queryKeywordRead, [
        user_keyword_id,
      ])) as any;
      let result = { isUpdated: queryKeywordReadResult.affectedRows };

      return result;
    } catch (error) {
      console.log(error);
      return { result: "error", message: error };
    }
  }

  // K3 POST localhost:3001/api/keywords/answered ㄱ-ㄲ
  // 한 키워드에 답변이 달렸음을 알리는 api
  public async updateKeywordAnswered(user_keyword_id: number): Promise<object> {
    try {
      const queryKeywordAnswer = `
        UPDATE UserKeyword SET answered = 2 WHERE user_keyword_id = ? AND answered = 1`;
      // answered = 0 인경우, 업데이트가 안될 수 있기에 조심! 항상 K3로 인해 answred = 1 로 바뀌고나서 실행된다는 시나리오!!
      const [queryKeywordAnswerResult] = (await this.pool.query(
        queryKeywordAnswer,
        [user_keyword_id]
      )) as any;

      let result = { isUpdated: queryKeywordAnswerResult.affectedRows };

      return result;
    } catch (error) {
      console.log(error);
      return { result: "error", message: error };
    }
  }

  // K4 req: CLElements --(CoreEngine)--> res: keywordsData
  // 자기소개서 업로드 후에 호출됨.
  public async putKeywordsInfoAfterCE(
    user_id: number,
    elements: string[]
  ): Promise<object> {
    try {
      let result = {} as any;

      elements = elements.map((e) =>
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

      //1. 자기소개서를 코어엔진에게 키워드 추출 요청
      let ceResult: IKeyword[][] = [];
      await axios
        .post(config.ceServerURL + "/ce/keywords", {
          elements: JSON.stringify(elements),
        })
        .then(function (response: any) {
          ceResult = parseObject(response.data);
        })
        .catch(function (error) {
          console.log("에러가났어욤", error);
          throw error;
        });

      console.log("ceResult", ceResult);

      // 2. 엔진에서 추출된 키워드를 디비에 넣기
      const { keywordsData, indexesResult } = (await this.makeKeywordsDbFormat(
        ceResult,
        user_id
      )) as any;

      if (keywordsData.length == 0) {
        // keywordsData가 없으면 넣을게 없으니까 바로 종료~
        result.userKeyword =
          "Your Keywords already exist or nothing matching keywords in db";
        result.userIndexes =
          "Your Keywords already exist or nothing matching keywords in db";
        return result;
      }

      // 3-1. UserKeyword 테이블에다가 keywordsData를 넣습니다.
      const queryUserkeyword = `INSERT INTO UserKeyword(keyword_id, user_id, answered, from_cl, is_ready, cl_element_id) VALUES ?`;
      const [userKeywordResult] = (await this.pool.query(queryUserkeyword, [
        keywordsData,
      ])) as any;
      result.userKeyword = userKeywordResult.info;

      //3-2. FromCL 테이블에다가 indexesData를 넣습니다.
      // let user_keyword_id: number = userKeywordResult.insertId;
      // const { indexesData } = (await this.makeIndexesDbFormat(
      //   indexesResult,
      //   user_keyword_id
      // )) as any;
      // const queryIndexesToFromCL = `INSERT INTO FromCL(user_keyword_id, cl_element_id, cl_index, length) VALUES ?`;
      // const [queryIndexesToFromCLResult] = (await this.pool.query(
      //   queryIndexesToFromCL,
      //   [indexesData]
      // )) as any;
      // result.userIndexes = queryIndexesToFromCLResult.info;

      return result;
    } catch (error) {
      throw error;
    }
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

  private async makeIndexesDbFormat(
    indexesResult: any,
    user_keyword_id: number
  ) {
    let indexesData = [] as any;
    let cl_element_id = 1;
    indexesResult.forEach((CLEs: any) => {
      CLEs.map((KeywordsInCLE: any[]) => {
        KeywordsInCLE.map((Keyword: any) => {
          indexesData.push([
            user_keyword_id,
            cl_element_id,
            Keyword[0],
            Keyword[1],
          ]);
        });
        user_keyword_id++;
      });
      cl_element_id++;
    });
    return { indexesData };
  }

  private isAlreadyExistKeyword(existIds: number[], compareId: number) {
    // APP-7 existNewUserKeywordsIdsArr에서 존재하면 return 2
    for (let i = 0; i < existIds.length; i++) {
      if (compareId === existIds[i]) return 1;
    }
    return 0;
  }

  private async makeKeywordsDbFormat(ceResult: any, user_id: number) {
    let keywordsData: any[] = [];
    let indexesResult: any[] = [];

    const queryExistUserKeyword = `
      SELECT keyword_id FROM UserKeyword WHERE user_id=?`;
    const [existUserKeyword] = (await this.pool.query(queryExistUserKeyword, [
      user_id,
    ])) as any;
    const existUserKeywordsIdsArr = existUserKeyword.map((e: any) => {
      return e.keyword_id;
    });

    let cl_element_id = 1;
    // APP-7 const existNewUserKeywordsIdsArr = [] as any;
    ceResult.forEach((keywordsInCLE: any) => {
      let indexesInCLE: any[] = [];
      keywordsInCLE.map((k: IKeyword) => {
        //check if a keyword already exist
        const isExist = this.isAlreadyExistKeyword(
          existUserKeywordsIdsArr,
          k.id
        );
        if (isExist == 0) {
          // APP-7 인덱스 관련된건,, 일단 묻어두기로
          // if (k.indices.length > 0) {
          //   indexesInCLE.push(k.indices);
          // }
          keywordsData.push([k.id, user_id, false, true, true, cl_element_id]);
          // APP-7 서로 다른 문항에 새로운 키워드가 등장했을때는 여전히 중복키워드가 발생함
          // Arr에 새로운 키워드를 넣어주면
          // existNewUserKeywordsIdsArr.push(k.id);
        } else if (isExist == 1) {
          // 이미 있는 경우
          // do nothing
        } else if (isExist == 2) {
          // APP-7
        }
      });
      indexesResult.push(indexesInCLE);
      cl_element_id++;
    });

    return { keywordsData: keywordsData, indexesResult: indexesResult };
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
