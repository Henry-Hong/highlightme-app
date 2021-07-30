declare module "mecab-ya" {
  import mecab from "mecab-ya";

  declare function nouns(
    text: string,
    callback: Function
  ): (text: string, callback: (err?: any) => any) => void;

  export { nouns };
}
