export interface IDbQuestion {
  id: number;
  content: string;
  answer: string;
  liked: boolean;
  disliked: boolean;
  scrapped: boolean;
  interviewListed: boolean;
}
