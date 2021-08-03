import { Service, Inject } from "typedi";
import config from "../config";
import { randomBytes } from "crypto";
import { Logger } from "winston";
import { nouns } from "mecab-ya";

import { ICL } from "../interfaces/ICL";

@Service()
export default class CLService {
  constructor(@Inject("logger") private logger: Logger) {}
  //왜 로그찍는부품을 생성자에 주입하는지? 왜 생성자에 private이 있는지?
  //생각해보니 이 생성자함수는 코드가 아무것도없네. 매개변수로 logger를 받기만하네. 결국 아무것도 안하고있네.

  public async uploadCL(text: string): Promise<{ result: string[] }> {
    // cl.elements.forEach((e) => {
    //   e.answer.search("");
    // });

    return { result: await this.getNouns(text) };
  }

  //private임을 잘봐라. public에서 이 함수를 사용한다.
  private getNouns(text: string): Promise<string[]> {
    //명사를 얻는 함수. string을 입력받아서, Promise를 반환
    return new Promise((resolve) => {
      //Promise를 리턴. 이런패턴많이쓴다.
      nouns(text, (err: Error, result: string[]) => {
        //nouns는 text와 콜백을 매개변수로받음.
        console.log(result);

        resolve(result);
      });
    });
  }
}
