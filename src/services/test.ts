import { Container, Service, Inject } from "typedi";
import mysql2 from "mysql2/promise";
import { Logger } from "winston";

@Service()
export default class TestService {
  constructor(@Inject("logger") private logger: Logger) {}

  public async dbTest(): Promise<{ content: object }> {
    const db = Container.get<mysql2.Connection>("db");

    const queryUserkeyword = `
    INSERT INTO CLElement (cl_element_id, problem, answer, public, cl_id)
    VALUES ?
    ON DUPLICATE KEY UPDATE problem = VALUES(problem), answer = VALUES(answer), modified_at = NOW()`;

    let cl_id = 1;
    let dummyCLES = [
      {
        cl_element_id: 1,
        problem: "problem1",
        answer: "answer1",
        _public: 1,
      },
      {
        cl_element_id: 2,
        problem: "problem2",
        answer: "answer2",
        _public: 1,
      },
      {
        cl_element_id: 3,
        problem: "problem4",
        answer: "answer4",
        _public: 1,
      },
    ];

    let rows: any = [];
    dummyCLES.forEach((e) => {
      let row = Object.values(e);
      row.push(cl_id);
      rows.push(row);
    });
    const [dbResult] = (await db.query(queryUserkeyword, [rows, rows])) as any; //as any라고 하면 사라짐.. ㅎㅎ ㅠㅠㅠ
    console.log(dbResult.insertId);
    console.log(dbResult.info); //"info": "Records: 3  Duplicates: 0  Warnings: 0",

    return { content: dbResult };
  }

  //자기소개서항목 추가
  //자기소개서항목 삭제
}
