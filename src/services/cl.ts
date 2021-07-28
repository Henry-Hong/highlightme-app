import { Service, Inject } from "typedi";
import config from "../config";
import { randomBytes } from "crypto";
import { Logger } from "winston";

import { IUser, IUserInputDTO } from "../interfaces/IUser";

@Service()
export default class CLService {
  constructor(@Inject("logger") private logger: Logger) {}

  public async SignIn(
    email: string,
    password: string
  ): Promise<{ user: IUser; token: string }> {
    const dummyUser: IUser = {
      _id: "sample id",
      nickname: "기운찬 곰",
      email: email,
      password: password,
      salt: "냠냠",
    };

    return { user: dummyUser, token: "dummy token" };
  }
}
