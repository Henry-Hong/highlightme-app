import { Container, Service, Inject } from "typedi";
import mysql2 from "mysql2/promise";
import config from "../config";
import { Logger } from "winston";
import { IKeyword } from "../interfaces/IKeyword";

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

      // console.log(result);

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
      //1. ce야 내가 자소서 보내줄테니까 키워드 목록 보내줘! ->이제 node서버가 클라이언트가 되는거고, ce서버가 서버가되는거임.
      const ceResult = await fetch(config.ceServerURL + "/keywords", {
        method: "GET",
        body: new URLSearchParams({
          elements: JSON.stringify([elements]),
        }),
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
      // ];

      //1.5. (임시) 기존 테이블 내용 날리기
      const queryDeleteAllRows = `DELETE FROM UserKeyword WHERE user_id = ?`;
      const [result] = await db.query(queryDeleteAllRows, [user_id]);

      //2. UserKeyword 테이블에다가 키워드를 넣습니다.
      let keywordsData: any[] = [];
      let indices: any[] = [];
      data.forEach((keywords) => {
        keywordsData.concat(
          keywords.map((k) => {
            if (k.type === 1) {
              //실존하는 키워드만 넣음
              if (k.indices.length > 0) {
                indices.push(k.indices);
              }
              return [k.id, user_id, false, true, true];
            }
          })
        );
      });
      const queryUserkeyword = `
        INSERT INTO UserKeyword(keyword_id, user_id, answered, from_cl, is_ready)
        VALUES ?`;
      const [userKeywordResult]: [
        mysql2.RowDataPacket[],
        mysql2.FieldPacket[]
      ] = await db.query(queryUserkeyword, [keywordsData]);

      //2. FromCL에 넣을 Indices 수집
      //3. FromCL 테이블에 userKeywordResult.insertId를 이용해서 넣어야됨
      let rows2: any[] = [];
      for (let e = 0; e < data.length; e++) {
        let row = [];
        row.push(userKeywordResult.insertId + e);
        row.push(cl_element_id);
        row.push(data[e].index);

        rows2.push(row);
      }

      const queryFromCL = `
      INSERT INTO FromCL(user_keyword_id, cl_element_id, cl_index)
      VALUES ?`;
      const [fromClResult] = await db.query(queryFromCL, [rows2]);

      return 1; //success
    } catch (error) {
      console.log(error);
      return 0;
    }
  }
}
