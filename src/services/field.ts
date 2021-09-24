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
    const [queryGetFieldsListResult] = await db.query(queryGetFieldsList);
    return queryGetFieldsListResult;
  }

  // POST localhost:3001/api/fields
  // 회원가입시, 사용자가 선택한 직무리스트를 업로드할때!
  public async createOrUpdateUserFields(
    user_id: number,
    field_ids: string
  ): Promise<object> {
    const db = Container.get<mysql2.Connection>("db");
    // 기존에 있는 유저 필드정보를 지우고,
    const queryDeleteExistUserFields = `DELETE FROM UsersFields WHERE user_id = (?)`;
    const [queryDeleteExistUserFieldsResult] = await db.query(
      queryDeleteExistUserFields,
      [user_id]
    );

    let convertedFieldIds = JSON.parse(field_ids)

    console.log(user_id, typeof user_id);
    console.log(convertedFieldIds, typeof convertedFieldIds);

    // 새로운 유저필드를 삽입한다.
    const queryPostFieldsList = `
      INSERT INTO UsersFields (user_id, field_id)
      VALUES ?`;
    let rows: object[] = [];
    convertedFieldIds.forEach((field_id: number) => {
      let row = [];
      row.push(user_id);
      row.push(field_id);
      rows.push(row);
    });
    const [queryPostFieldsListResult] = await db.query(queryPostFieldsList, [
      rows,
    ]);

    return { message: "createOrUpdateUserFields is complete!" };
  }
}
