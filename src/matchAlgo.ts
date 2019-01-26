import { shuffle } from 'lodash';
import { IZulipUser } from './zulipMessenger';

type email = string;

interface IUser {
  email: string;
  full_name: string;
  prevMatches: email[];
  // ==== Proposed Data Structure ===
  // potentialMatches: {
  // newMatch: IUser[]
  // oldMatch: IUser[] // sorted by date
  // }
  // hasBeenMatched: boolean
}

// INPUT: IUser
// OUTPUT: user name and email, to easily pass off to zulip API sendMessage
// NOTE: for database, need primary keys for users, new table for matches (foreign key),
// interface IUser: is the result of search our new db, and not zulip stream API shit
export function makeMatches(
  usersToMatch: IUser[],
  fallBackUser: IUser[]
): Array<[IUser, IUser]> {
  // TODO: deep clone the userToMatch

  // while there are users to match
  // get the first user from usersToMatch
  // get all potential users they can match with (All the users )
  // find a user who is not in their prevMatch
  // if there is a user:
  // pair the those users
  // find the other user and also remove them from usersToMatch list
  // else:
  // just pair them with the least recent prev match

  return [];
}

/**
 *
 * @param currUser
 * @param refUsersToMatch
 */
export function getUsersPotentialMatches(
  currUser: IUser,
  refUsersToMatch: IUser[]
): IUser[] {
  // get currUser's prevMatches
  // For all usersToMatch:
  // check if its in prevMatch or not
  // return that value:

  return [];
}

interface IpastMatchObj {
  date: string;
  email1: string;
  email2: string;
}

export function _prevMatchingAlgo(
  emails: email[],
  pastMatches: IpastMatchObj[],
  oddNumberBackupEmails = ['oddEmail@rc.com']
): Array<[string, string]> {
  // const unmatchedEmails = shuffle(emails); //
  const unmatchedEmails = emails; //
  const newMatches = [];

  // console.log("-----------------------");
  // console.log("unmatchedEmails:");
  // console.log(unmatchedEmails);
  // console.log("-----------------------");

  while (unmatchedEmails.length > 0) {
    const currentEmail = unmatchedEmails.shift();

    // console.log("-----------------------");
    // console.log("currentEMail:");
    // console.log(currentEmail);
    // console.log("-----------------------");

    /**
     *
     *
     *
     */
    const pastMatchedEmails = pastMatches
      .filter(
        match => match.email1 === currentEmail || match.email2 === currentEmail
      ) // filter to current email's matches
      .sort((a, b) => Number(new Date(a.date)) - Number(new Date(b.date))) // sort oldest to newest, so if there is a conflict we can rematch with oldest first
      .map(match =>
        match.email1 === currentEmail ? match.email2 : match.email1
      ) // extract only the other person's email out of the results (drop currentEmail and date)
      .filter(email => unmatchedEmails.includes(email)) // remove past matches who are not looking for a match today or who already got matched
      .filter((value, index, self) => self.indexOf(value) === index); // uniq emails // TODO: this should be a reduce that adds a match count to every email so we can factor that into matches

    // console.log("------- pastMatchedEmails: ");
    // console.log(pastMatchedEmails);
    // console.log("-----------------------");

    const availableEmails = unmatchedEmails.filter(
      email => !pastMatchedEmails.includes(email)
    );

    if (availableEmails.length > 0) {
      // TODO: potentialy prioritize matching people from different batches
      newMatches.push([currentEmail, availableEmails[0]]);
      unmatchedEmails.splice(unmatchedEmails.indexOf(availableEmails[0]), 1);
    } else if (pastMatchedEmails.length > 0 && unmatchedEmails.length > 0) {
      newMatches.push([currentEmail, pastMatchedEmails[0]]);
      unmatchedEmails.splice(unmatchedEmails.indexOf(pastMatchedEmails[0]), 1);
    } else {
      // this should only happen on an odd number of emails
      // TODO: how to handle the odd person
      newMatches.push([
        currentEmail,
        oddNumberBackupEmails[
          Math.floor(Math.random() * oddNumberBackupEmails.length)
        ]
      ]);
    }
    // logger.info("<<<<<<", newMatches);
  }
  return newMatches;
}
