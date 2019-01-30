import sqlite from 'better-sqlite3';
import { ISqlResponse, ISqlError } from '../db';

const TABLE_NAME = 'Match';

interface IMatchModel {
  createTable: () => ISqlResponse;
  cleanTable?: () => ISqlResponse; // TODO: remove this? allow only for testing?
  count: () => ISqlError | number;
  find: any;
  add: any;
}

export function initMatchModel(db: sqlite): IMatchModel {
  // Always have a created Table!
  // createTable();

  function createTable(): ISqlResponse {
    const query = `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      match_id INTEGER PRIMARY KEY NOT NULL UNIQUE,
      user_1_id INTEGER NOT NULL,
      user_2_id INTEGER NOT NULL,
      date TEXT NOT NULL
      FOREIGN KEY (user_1_id) REFERENCES User (user_id)
        ON DELETE CASCADE ON UPDATE NO ACTION,
      FOREIGN KEY (user_2_id) REFERENCES User (user_id)
        ON DELETE CASCADE ON UPDATE NO ACTION
    )`;

    try {
      db.exec(query);
    } catch (e) {
      return { status: 'FAILURE', message: e };
    }
    return { status: 'SUCCESS' };
  }

  function cleanTable(): ISqlResponse {
    const query = `DELETE FROM ${TABLE_NAME} WHERE true`;
    try {
      db.exec(query);
    } catch (e) {
      return { status: 'FAILURE', message: e };
    }
    return { status: 'SUCCESS' };
  }

  function count(): number {
    let numRecords;

    const getAllTables = db.prepare(
      `select name from sqlite_master where type='table'`
    );

    const tables = getAllTables.all();

    const stmt = db.prepare(`SELECT COUNT(match_id) FROM Match`);
    numRecords = stmt.run();

    return numRecords;
  }

  // TODO: (LATER) add flexiblity to find targetUser via email
  // Question?? Relationship query of getting a user's matches. Should this be in user table?
  // - fn: getMatches by day?
  // - fn: get all matches for particular user?
  // - fn: get match by match_id

  function findAllUserMatches(targetUser: number): IMatchesSqlResponse {
    const findStmt = db.prepare(
      `SELECT * FROM ${TABLE_NAME} WHERE user_1_id = ? OR user_2_id = ?`
    );
    let matches = [];
    try {
      matches = findStmt.all(targetUser, targetUser);
    } catch (e) {
      return {
        status: 'FAILURE',
        message: e
      };
    }
    return {
      status: 'SUCCESS',
      payload: matches
    };
  }

  // required user_id 1&2, date as option?
  interface IAddMatchArgs {
    user_1_id: number;
    user_2_id: number;
    date?: string;
  }
  function addMatch(matchArgs: IAddMatchArgs) {
    const insertQuery = db.prepare(`
    INSERT INTO ${TABLE_NAME} (user_1_id, user_2_id, date) VALUES (@user_1_id, @user_2_id, date)`);

    let newMatch;
    // TODO: validate that date is in the right format
    const recordVals = {
      user_1_id: matchArgs.user_1_id,
      user_2_id: matchArgs.user_2_id,
      date: matchArgs.date || new Date().toISOString().split('T')[0]
    };

    try {
      newMatch = insertQuery.run(recordVals);
    } catch (e) {
      return { status: 'FAILURE', message: e };
    }
    return {
      status: 'SUCCESS',
      payload: newMatch
    };
  }

  // TODO: (LATER) add flexbility to update match by emails?
  // interface IupdateMatchArgs {
  //   user_id_1: number,
  //   user_id_2: number,
  // }
  // function updateMatch()
  return {
    createTable,
    cleanTable,
    count,
    find: findAllUserMatches,
    add: addMatch
    // update: updateMatch // TODO: later
  };
}

// ====== definitions for matches ====
interface IMatchesSqlResponse extends ISqlResponse {
  payload?: any[]; // TODO: determine the shape of the user match (just id, user info minus their matches?)
}
