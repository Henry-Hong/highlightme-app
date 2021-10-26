import { Container, Service, Inject } from "typedi";
import mysql2 from "mysql2/promise";
import config from "../config";
import { randomBytes } from "crypto";
import { Logger } from "winston";

import { ICL } from "../interfaces/ICL";
import { parseObject } from "../utils";

@Service()
export default class fieldService {
  constructor(@Inject("logger") private logger: Logger) {}
  // GET localhost:3001/api/fields
  // 회원가입시, 직무리스트를 불러올때!
  public async getFieldsList(user_id: number): Promise<object> {
    const pool = Container.get<mysql2.Pool>("pool");
    const queryGetFieldsList = `
      SELECT * FROM Field`;
    //----------------------------
    // const query = `SELECT * FROM BigField`;
    // const [dbResult] = await db.query(query);
    // const pResult = JSON.parse(JSON.stringify(dbResult));

    // const query2 = `SELECT * FROM Field`;
    // const [dbResult2] = await db.query(query2);
    // const pResult2 = JSON.parse(JSON.stringify(dbResult2));

    // let result = { bigField: [] } as any;

    // let idx = 1;
    // for (let i = 0; i < 14; i++) {
    //   let json = {} as any;
    //   json.id = pResult[i].big_field_id;
    //   json.name = pResult[i].big_field;
    //   json.smallGroup = [];

    //   for (let j = 0; j < pResult2.length; j++) {
    //     if (pResult2[j].big_field_id == idx) {
    //       let sjson = {} as any;
    //       sjson.id = pResult2[j].field_id;
    //       sjson.name = pResult2[j].field;
    //       json.smallGroup.push(sjson);
    //     } else if (pResult2[j].big_field_id < idx) {
    //       continue;
    //     } else {
    //       idx++;
    //       break;
    //     }
    //   }

    //   result.bigField.push(json);
    // }
    //----------------------------
    const [queryGetFieldsListResult] = await pool.query(queryGetFieldsList);
    return queryGetFieldsListResult;
  }

  // POST localhost:3001/api/fields
  // 회원가입시, 사용자가 선택한 직무리스트를 업로드할때!
  public async createOrUpdateUserFields(
    user_id: number,
    field_ids: string
  ): Promise<object> {
    const pool = Container.get<mysql2.Pool>("pool");
    let userInfo = "newUser's field is inserted!";
    // 1. 기존에 있는 유저 필드정보를 지우고,
    const queryDeleteExistUserFields = `DELETE FROM UsersFields WHERE user_id = (?)`;
    const [queryDeleteExistUserFieldsResult] = await pool.query(
      queryDeleteExistUserFields,
      [user_id]
    );
    const queryDeleteExistUserFieldsResultParse = parseObject(
      queryDeleteExistUserFieldsResult
    );
    if (queryDeleteExistUserFieldsResultParse.affectedRows != 0)
      userInfo = "user's field is updated";

    // 2. 새로운 유저필드를 삽입한다.
    const queryPostFieldsList = `
      INSERT INTO UsersFields (user_id, field_id)
      VALUES ?`;
    let convertedFieldIds = JSON.parse(field_ids);
    const rows = this.makeRows(convertedFieldIds, user_id);
    const [queryPostFieldsListResult] = await pool.query(queryPostFieldsList, [
      rows,
    ]);

    return { message: `createOrUpdateUserFields is complete!, ${userInfo}` };
  }

  private makeRows(FieldIds: any, user_id: any) {
    let rows: object[] = [];
    FieldIds.forEach((field_id: number) => {
      let row = [];
      row.push(user_id);
      row.push(field_id);
      rows.push(row);
    });
    return rows;
  }
}
