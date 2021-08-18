import { Container, Service, Inject } from "typedi";
import mysql2 from "mysql2/promise";
import config from "../config";
import { Logger } from "winston";

@Service()
export default class KeywordService {
  constructor(@Inject("logger") private logger: Logger) {}

  public async putKeywordsInfoAfterCE(
    answer: string,
    cl_element_id: number
  ): Promise<number> {
    try {
      //1. ce야 내가 자소서 보내줄테니까 키워드 목록 보내줘! ->이제 node서버가 클라이언트가 되는거고, ce서버가 서버가되는거임.
      const ceResult = await fetch(config.ceServerURL + "/keywords", {
        method: "GET",
        body: new URLSearchParams({
          elements: JSON.stringify([answer]),
        }),
      });
      const data: any[] = await ceResult.json(); //assuming data is json
      // const data = [
      //   {
      //     id: 1, //keyword_id
      //     index: 1004, //index in CL element
      //     type: 0, //0: main, 1: related, 2: custom
      //   },
      //   {
      //     id: 2,
      //     index: 486,
      //     type: 0, //type이 전부다 main 이라는 가정하에,,, ㅎㅎ
      //   },
      // ];

      //2. UserKeyword 테이블에다가 키워드를 넣습니다.
      const db = Container.get<mysql2.Connection>("db");

      let rows: any[] = [];
      data.forEach((keyword) => {
        let row = [];
        row.push(keyword.id);
        row.push(2); //row.push(user_id);
        row.push(0); //answered, 0은상수 -> 상수관리는 나중에 알아보도록.. ㅠ
        row.push(1); //fromcl
        row.push(1); //is_ready

        rows.push(row);
      });
      const queryUserkeyword = `
        INSERT INTO UserKeyword(keyword_id, user_id, answered, from_cl, is_ready)
        VALUES ?`;
      const [userKeywordResult] = (await db.query(queryUserkeyword, [
        rows,
      ])) as any;

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
