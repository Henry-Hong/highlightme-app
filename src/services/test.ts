import { Container, Service, Inject } from "typedi";
import mysql2 from "mysql2/promise";
import { Logger } from "winston";
import * as fs from "fs";
import * as path from "path";

@Service()
export default class TestService {
  constructor(@Inject("logger") private logger: Logger) {}

  public async dbTest(): Promise<{ content: object }> {
    const db = Container.get<mysql2.PoolConnection>("db");

    const query = `SELECT * FROM BigField`;
    const [dbResult] = await db.query(query);
    const pResult = JSON.parse(JSON.stringify(dbResult));

    const query2 = `SELECT * FROM Field`;
    const [dbResult2] = await db.query(query2);
    const pResult2 = JSON.parse(JSON.stringify(dbResult2));

    let result = { bigField: [] } as any;

    let idx = 1;
    for (let i = 0; i < 14; i++) {
      let json = {} as any;
      json.id = pResult[i].big_field_id;
      json.name = pResult[i].big_field;
      json.smallGroup = [];

      for (let j = 0; j < pResult2.length; j++) {
        if (pResult2[j].big_field_id == idx) {
          let sjson = {} as any;
          sjson.id = pResult2[j].field_id;
          sjson.name = pResult2[j].field;
          json.smallGroup.push(sjson);
        } else if (pResult2[j].big_field_id < idx) {
          continue;
        } else {
          idx++;
          break;
        }
      }

      result.bigField.push(json);
    }

    console.log(result);

    // fs.readFile(
    //   path.join(__dirname, "../data.json"),
    //   "utf8",
    //   async (error, data) => {
    //     if (error) throw error;
    //     const pData = JSON.parse(data);
    //   }
    // );

    return { content: result };
  }
}
