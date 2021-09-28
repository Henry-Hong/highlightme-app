import { Container, Service, Inject } from "typedi";
import mysql2 from "mysql2/promise";
import config from "../config";
import { randomBytes } from "crypto";
import { Logger } from "winston";

import { ICL } from "../interfaces/ICL";

@Service()
export default class fieldService {
  constructor(@Inject("logger") private logger: Logger) {}

  // GET localhost:3001/api/fields
  // 회원가입시, 직무리스트를 불러올때!
  public async getFieldsList(user_id: number): Promise<object> {
    const db = Container.get<mysql2.Connection>("db");
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
    const [queryGetFieldsListResult] = await db.query(queryGetFieldsList);
    return queryGetFieldsListResult;
  }

  // POST localhost:3001/api/fields
  // 회원가입시, 사용자가 선택한 직무리스트를 업로드할때!
  public async createOrUpdateUserFields(
    user_id: number,
    field_ids: []
  ): Promise<object> {
    const db = Container.get<mysql2.Connection>("db");
    // 기존에 있는 유저 필드정보를 지우고,
    const queryDeleteExistUserFields = `DELETE FROM UsersFields WHERE user_id = (?)`;
    const [queryDeleteExistUserFieldsResult] = await db.query(
      queryDeleteExistUserFields,
      [user_id]
    );
    // 새로운 유저필드를 삽입한다.
    field_ids.forEach(async (field_id) => {
      const queryPostFieldsList = `
      INSERT INTO UsersFields (user_id, field_id, modified_at)
      VALUES (?, ?, NOW())`;
      const [queryPostFieldsListResult] = await db.query(queryPostFieldsList, [
        user_id,
        field_id,
      ]);
    });

    return { message: "createOrUpdateUserFields is complete!" };
  }
}
