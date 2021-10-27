export interface IQuestion {
  id: number;
  keywordId?: number;
  content: string;
  answer?: string;
  actions: {
    liked: boolean;
    disliked: boolean;
    scrapped: boolean;
    interviewListed: boolean;
  };
}
