export interface IKeyword {
  id: number;
  keyword: string | undefined;
  rawKeyword: string;
  indices: number[];
  type: number; //0: main, 1: related, 2: custom
}
