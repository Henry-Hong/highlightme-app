export interface IUser {
  _id: string;
  nickname: string;
  email: string;
  password: string;
  salt: string;
}

export interface IUserInputDTO {
  nickname: string;
  email: string;
  password: string;
}
