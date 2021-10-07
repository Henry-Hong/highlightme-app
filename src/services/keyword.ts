import { Container, Service, Inject } from "typedi";
import mysql2 from "mysql2/promise";
import config from "../config";
import { Logger } from "winston";
import { IKeyword } from "../interfaces/IKeyword";
import axios from "axios";
import LoggerInstance from "../loaders/logger";

@Service()
export default class KeywordService {
  constructor(@Inject("logger") private logger: Logger) {}

  public async getUserKeywords(
    user_id: number
  ): Promise<{ keyword: string; id: number }[]> {
    try {
      const db = Container.get<mysql2.Connection>("db");

      const queryUserKeyword = `
        SELECT keyword, keyword_id FROM Keyword WHERE keyword_id IN (SELECT keyword_id FROM UserKeyword WHERE user_id = ?)`;
      const [result] = (await db.query(queryUserKeyword, [user_id])) as any;

      let ks: { keyword: string; id: number }[] = [];
      for (let keyword of result) {
        ks.push({ keyword: keyword.keyword, id: keyword.keyword_id });
      }

      return ks; //success
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  public async putKeywordsInfoAfterCE(
    user_id: number,
    elements: string
  ): Promise<number> {
    const db = Container.get<mysql2.Connection>("db");

    try {
      // 1. req: CLElements --(CoreEngine)--> res: keywordsData
      // const ceResult = await fetch(config.ceServerURL + "/keywords", {
      //   method: "GET",
      //   body: new URLSearchParams({
      //     elements: JSON.stringify([elements]),
      //   }),
      // });

      let ceResult = {} as any;
      await axios
        .post(config.ceServerURL + "/keywords", {
          elements: elements, //searchParams은 query같은데,,, body로 보내야되는거아닌가??
        })
        .then(function (response: any) {
          ceResult = response.data;
        })
        .catch(function (error) {
          throw error;
        });

      const data: IKeyword[][] = await ceResult.json(); //assuming data is json
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

      //1.5. (임시) 기존 테이블 내용 날리기
      // const queryDeleteAllRows = `DELETE FROM UserKeyword WHERE user_id = ?`;
      // const [result] = await db.query(queryDeleteAllRows, [user_id]);

      //2. UserKeyword 테이블에다가 keywordsData를 넣습니다.
      let keywordsData: any[] = [];
      let indices: any[] = [];
      data.forEach((keywords) => {
        let indices_cle: any[] = [];
        keywords.map((k) => {
          if (k.type === 1) {
            //실존하는 키워드만 넣음
            if (k.indices.length > 0) {
              indices_cle.push(k.indices);
            }
            keywordsData.push([k.id, user_id, false, true, true]);
          }
        });
        indices.push(indices_cle);
      });

      const queryUserkeyword = `
        INSERT INTO UserKeyword(keyword_id, user_id, answered, from_cl, is_ready)
        VALUES ?`;
      const [userKeywordResult] = (await db.query(queryUserkeyword, [
        keywordsData,
      ])) as any;
      let user_keyword_id: number = userKeywordResult.insertId;

      // //2. FromCL에 넣을 Indices 수집
      // //3. FromCL 테이블에 userKeywordResult.insertId를 이용해서 넣어야됨
      let indicesData = [] as any;
      let cl_element_id = 1;
      indices.forEach((keywords) => {
        keywords.map((K: any[]) => {
          K.map((k: any) => {
            indicesData.push([user_keyword_id, cl_element_id, k]);
          });
          user_keyword_id++;
        });
        cl_element_id++;
      });

      const queryIndicesToFromCL = `
      INSERT INTO FromCL(user_keyword_id, cl_element_id, cl_index)
      VALUES ?`;
      const [queryIndicesToFromCLResult] = await db.query(
        queryIndicesToFromCL,
        [indicesData]
      );

      return 1; //success
    } catch (error) {
      return 0;
    }
  }
}
