import sqlite from 'better-sqlite3';

import { ISqlOk, ISqlError, IAddMatchArgs, IMatchDB } from './db.interface';
import { initUserMatchModel } from './usermatch';

const TABLE_NAME = 'Match';

// interface IMatchModel {
//   createTable: () => ISqlResponse;
//   cleanTable?: () => ISqlResponse; // TODO: remove this? allow only for testing?
//   count: () => ISqlError | number;
//   find: (targetUserId: number) => ISqlResponse;
//   add: (opts: IAddMatchArgs) => ISqlResponse;
// }

// TODO: update the exposed match model methods later
export function initMatchModel(db: sqlite): any {
  // Always have a created Table!
  // createTable();

  function createTable(): void {
    // TODO: add raincheck column
    // NOTE: primary key, composite of user_1, user_2, & date
    const query = `CREATE TABLE IF NOT EXISTS Match (
      id INTEGER PRIMARY KEY NOT NULL UNIQUE,
      date TEXT NOT NULL
    )`;

    // const query = `CREATE TABLE IF NOT EXISTS Match (
    //   match_id INTEGER PRIMARY KEY NOT NULL UNIQUE,
    //   user_1_id INTEGER NOT NULL references User(user_id),
    //   user_2_id INTEGER NOT NULL references User(user_id),
    //   date TEXT NOT NULL
    // )`;

    db.exec(query);
  }

  // Rename to remove all records & use it in the test
  function _deleteRecords() {
    const query = `DELETE FROM ${TABLE_NAME} WHERE true`;
    db.exec(query);
  }

  function count(): number {
    const stmt = db.prepare(`SELECT COUNT(id) FROM Match`);
    const { 'COUNT(id)': numRecord } = stmt.get();
    return numRecord;
  }

  // TODO: (LATER) add flexiblity to find targetUser via email
  // Question?? Relationship query of getting a user's matches. Should this be in user table?
  // - fn: getMatches by day?
  // - fn: get all matches for particular user?
  // - fn: get match by match_id
  // function findAllUserMatches(targetUser: number): IMatchDB {
  //   const findStmt = db.prepare(
  //     `SELECT * FROM Match WHERE user_1_id = ? OR user_2_id = ?`
  //   );
  //   // let matches = [];
  //   return findStmt.all(targetUser, targetUser);
  // }

  // export interface IAddMatchArgs {
  //   user_1_id: number;
  //   user_2_id: number;
  //   date?: string;
  // }

  // TODO: (LATER) add flexbility to update match by emails?
  function addMatch(matchArgs: IAddMatchArgs): ISqlOk | ISqlError {
    // const insertQuery = db.prepare(`
    // INSERT INTO ${TABLE_NAME} (user_1_id, user_2_id, date) VALUES (@user_1_id, @user_2_id, @date)`);

    // TODO: validate that date is in the right format
    const { user_1_id, user_2_id } = matchArgs;
    const date = matchArgs.date || new Date().toISOString().split('T')[0];

    const insertMatchQuery = db.prepare(`
    INSERT INTO Match (date) VALUES (?)`);
    const {
      changes: rowsChanged,
      lastInsertROWID: newMatchId
    } = insertMatchQuery.run(date);

    if (!rowsChanged) {
      throw new Error(`Could not insert into Match table`);
      // return {
      //   status: 'ERROR',
      //   message: 'Error: could not insert into Match table'
      // };
    }

    // Insert into User_Match Table:
    const {
      add: insertUserMatch,
      createTable: createUserMatchTable
    } = initUserMatchModel(db);
    createUserMatchTable();
    const { status: status1 } = insertUserMatch(user_1_id, newMatchId);
    const { status: status2 } = insertUserMatch(user_2_id, newMatchId);

    if (status1 === 'OK' && status2 === 'OK') {
      return {
        status: 'OK'
      };
    } else {
      return {
        status: 'ERROR',
        message: 'ERROR: failed to add to User_Match'
      };
    }
  }

  // interface IupdateMatchArgs {
  //   user_id_1: number,
  //   user_id_2: number,
  // }

  return {
    createTable,
    _deleteRecords,
    count,
    // find: findAllUserMatches,
    add: addMatch
    // update: updateMatch // TODO: later
  };
}
