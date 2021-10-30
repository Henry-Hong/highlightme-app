// export interface IUser {
//   _id: string;
//   nickname: string;
//   email: string;
//   password: string;
//   salt: string;
// }

export interface IUser {
  userId: number;
  email: string;
  provider?: string;
}
