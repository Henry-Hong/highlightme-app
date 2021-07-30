import { ICLElement } from "./ICLElement";

export interface ICL {
  cl_id: string;
  comment: string;
  elements: ICLElement[];
}
