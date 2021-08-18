import { Container, Service, Inject } from "typedi";
import mysql2 from "mysql2/promise";
import { Logger } from "winston";

@Service()
export default class TestService {
  constructor(@Inject("logger") private logger: Logger) {}

  public async dbTest(): Promise<{ content: object }> {
    const db = Container.get<mysql2.Connection>("db");

    let result = [
      {
        id: 123, //keyword_id
        index: 12, //index in CL element
        type: 0, //0: main, 1: related, 2: custom
      },
      {
        id: 124,
        index: 15,
        type: 0, //type이 전부다 main 이라는 가정하에,,, ㅎㅎ
      },
    ];

    // const queryUserkeyword = "INSERT INTO UserKeyword VALUES ?";
    // let rows: any[] = [];
    // result.forEach((keyword) => {
    //   let row = [];
    //   row.push(keyword.id);
    //   row.push(1);
    //   row.push(0); //answered
    //   row.push(1); //isfromcl
    //   rows.push(row);
    // });

    // const [dbResult] = await db.query(queryUserkeyword, [rows]);

    const queryUserkeyword = `
    INSERT INTO UserKeyword(keyword_id,user_id,answered,from_cl,is_ready)
    VALUES ?`;
    // let rows: any[] = [];
    // result.forEach((keyword) => {
    //   let row = [];
    //   row.push(keyword.id);
    //   row.push(1);
    //   row.push(0); //answered
    //   row.push(1); //isfromcl
    //   rows.push(row);
    // });

    const rows = [
      [1, 2, 0, 1, 1],
      [1, 2, 0, 1, 1],
    ];
    const [dbResult] = (await db.query(queryUserkeyword, [rows])) as any; //as any라고 하면 사라짐.. ㅎㅎ ㅠㅠㅠ
    console.log(dbResult.insertId);
    console.log(dbResult.info); //"info": "Records: 3  Duplicates: 0  Warnings: 0",

    return { content: dbResult };
  }

  //자기소개서항목 추가
  //자기소개서항목 삭제
}
