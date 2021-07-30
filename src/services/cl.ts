import { Service, Inject } from "typedi";
import config from "../config";
import { randomBytes } from "crypto";
import { Logger } from "winston";
import { nouns } from "mecab-ya";

import { ICL } from "../interfaces/ICL";

@Service()
export default class CLService {
  constructor(@Inject("logger") private logger: Logger) {}

  public async uploadCL(text: string): Promise<{ result: string[] }> {
    // cl.elements.forEach((e) => {
    //   e.answer.search("");
    // });

    return { result: await this.getNouns(text) };
  }

  private getNouns(text: string): Promise<string[]> {
    return new Promise((resolve) => {
      nouns(text, (err: Error, result: string[]) => {
        console.log(result);

        resolve(result);
      });
    });
  }
}
