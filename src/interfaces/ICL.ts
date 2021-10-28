import { ICLElement } from "./ICLElement";

export interface ICL {
  elements: ICLElement[];
  title: string;
  company: string;
  tags: string[];
  comments: string;
}
