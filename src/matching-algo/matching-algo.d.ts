export type prevMatch = {
  email: string;
  matchDate: Date;
};
export interface IUser {
  email: string;
  full_name: string;
  prevMatches: prevMatch[];
  // hasBeenMatched: boolean
}

export interface IpastMatchObj {
  date: string;
  email1: string;
  email2: string;
}
