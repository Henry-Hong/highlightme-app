import UserModel from "../models/user"; // <- User class

declare global {
  namespace Express {
    export interface User extends UserModel {}
  }
}
