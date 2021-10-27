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
  pool = Container.get<mysql2.Pool>("pool");

  /**
   * U5.1 GET localhost:3001/api/fields
   * 회원가입시, 직무리스트를 불러올때!
   * @param userId
   * @returns
   */
  public async getFieldsList(userId: number): Promise<object> {
    const queryGetFieldsList = `
      SELECT * FROM Field`;
    const [queryGetFieldsListResult] = await this.pool.query(
      queryGetFieldsList
    );
    return queryGetFieldsListResult;
  }

  /**
   * U5.2 POST localhost:3001/api/fields
   * 회원가입시, 사용자가 선택한 직무리스트를 업로드할때!
   * @param userId
   * @param fieldIds
   * @returns
   */
  public async createOrUpdateUserFields(
    userId: number,
    fieldIds: string
  ): Promise<number> {
    try {
      // 1. 기존에 있는 유저 필드정보를 지우고,
      const queryDeleteUserFields = `DELETE FROM UsersFields WHERE user_id = (?)`;
      const [rst1] = (await this.pool.query(queryDeleteUserFields, [
        userId,
      ])) as any;

      // 2. 새로운 유저필드를 삽입한다.
      const queryPutUserFields = `INSERT INTO UsersFields (user_id, field_id) VALUES ?`;
      const rows = this.makeRows(fieldIds, userId);
      const [rst2] = (await this.pool.query(queryPutUserFields, [rows])) as any;

      // 200: ok, 201: created
      if (rst1.affectedRows > 0 && rst2.affectedRows > 0) return 200;
      else if (rst1.affectedRows == 0 && rst2.affectedRows > 0) return 201;
      else return 400; //bad request
    } catch (error) {
      throw error;
    }
  }

  private makeRows(fieldIds: any, userId: any) {
    fieldIds = JSON.parse(fieldIds);
    return fieldIds.map((fieldId: number) => [userId, fieldId]);
  }
}
