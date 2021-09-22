import { Container, Service, Inject } from "typedi";
import mysql2 from "mysql2/promise";
import config from "../config";
import { randomBytes } from "crypto";
import { Logger } from "winston";

import { ICL } from "../interfaces/ICL";

@Service()
export default class fieldService {
  constructor(@Inject("logger") private logger: Logger) {}

  // 회원가입시, 직무리스트를 불러올때!
  public async getFieldsList(user_id: number): Promise<object> {
    const db = Container.get<mysql2.Connection>("db");
    const queryFieldsList = `
      SELECT * FROM Field`;
    const [queryFieldsListResult] = await db.query(queryFieldsList);
    return queryFieldsListResult;
  }
}
