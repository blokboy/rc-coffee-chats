import sqlite from 'better-sqlite3';
import * as types from './dbTypes';

export class Model<M> {
  protected static db: sqlite;
  tableName: string; // ex. User
  fields: types.fieldListing;

  constructor(db: sqlite, tableName: string, fields: types.fieldListing) {
    if (!Model.db) {
      Model.db = db;
    }
    this.tableName = tableName;
    this.fields = fields;
  }

  get primaryKey(): string {
    const primaryKeyArr = Object.keys(this.fields).filter(
      fieldStr => this.fields[fieldStr].meta.isPrimaryKey
    );
    if (primaryKeyArr.length !== 1) {
      throw new Error('There must be only one primary key for each table');
    }
    return primaryKeyArr[0];
  }

  get foreignKeys(): string[] {
    return Object.keys(this.fields).filter(s => !!this.fields[s].foreignKey);
  }

  /** === create() ====
   *
   */
  public create(): { rawQuery: string } {
    const queryBodyArr: string[] = [];

    // 2) Get each field pertaining to column, ex. username TEXT NOT NULL,
    Object.keys(this.fields).forEach(field => {
      // Question: is there a way to avoid explicit typing here?
      const { type } = this.fields[field] as types.IField;
      let fieldStr = `${field} ${type}`;

      if (!!this.fields[field].meta) {
        const {
          meta: { isPrimaryKey, isUnique, isNotNull, isDefault },
          defaultValue
        } = this.fields[field];
        if (isPrimaryKey) {
          fieldStr = fieldStr + ' PRIMARY KEY';
        }
        if (isUnique) {
          fieldStr = fieldStr + ' UNIQUE';
        }
        if (isNotNull) {
          fieldStr = fieldStr + ' NOT NULL';
        }
        if (isDefault && defaultValue !== '') {
          fieldStr = fieldStr + ' DEFAULT ' + defaultValue;
        }
      }

      queryBodyArr.push(fieldStr);
    });

    if (queryBodyArr.length === 0) {
      throw new Error('Must have at least one field in the table');
    }

    for (const fieldStr in this.fields) {
      const field = this.fields[fieldStr];
      if (field.hasOwnProperty('foreignKey')) {
        const fkField = this.fields[fieldStr];
        const { refTable, refColumn } = fkField.foreignKey;

        queryBodyArr.push(
          `FOREIGN KEY (${fieldStr}) REFERENCES ${refTable} (${refColumn})
          ON DELETE CASCADE ON UPDATE NO ACTION`
        );
      }
    }

    const queryBody = queryBodyArr.join(',\n');
    const query = `CREATE TABLE IF NOT EXISTS ${this.tableName} (${queryBody})`;

    Model.db.exec(query);

    return {
      rawQuery: query
    };
  }

  /** ======== find() =========
   *
   * @param queryArgs
   */
  public find(queryArgs = {}): M[] {
    // this.__validateQueryArgs(queryArgs, false);
    const { db } = Model;

    let query;
    if (Object.keys(queryArgs).length === 0) {
      query = db.prepare(`SELECT * FROM ${this.tableName}`);
    } else {
      const whereArr = Object.keys(queryArgs).map(f => `${f} = @${f}`);
      query = db.prepare(
        `SELECT * from ${this.tableName} WHERE ${whereArr.join(' AND ')}`
      );
    }
    const result = query.all(queryArgs);

    return result;
  }

  /** ========= add() =========
   *
   * @param queryArgs
   */
  public add(queryArgs = {}): { changes: number; lastInsertROWID: number } {
    this.__validateQueryArgs(queryArgs);
    const { db } = Model;
    // NOTE: do not have to do this in sqlite3, since we can still create the
    // table. However we need to do this in
    // 4) Check that any Foreign Keys vals exist in separate tables:

    // 5) create query
    const fields = Object.keys(queryArgs);
    const fieldPlaceholder = fields.map(f => `@${f}`);

    const queryStr = `INSERT INTO ${this.tableName} (
      ${fields.join(', ')}
      ) VALUES (
      ${fieldPlaceholder.join(', ')}
      )`;

    // 6) run query
    const query = db.prepare(queryStr);
    const result = query.run(queryArgs);

    console.log(result);
    return result;
  }

  /** ========= update() =========
   *
   * @param updateArgs
   * @param whereArgs
   */
  public update(
    updateArgs = {},
    whereArgs = {}
  ): { changes: number; error?: string } {
    const { db } = Model;
    // TODO: fix this so validator checks that all fields are within:
    // - notPrimaryKey
    // this.__validateQueryArgs(updateArgs, false);

    // Check that there are valid records to update
    const foundRecords = this.find(whereArgs);
    if (foundRecords.length === 0) {
      throw new Error('Found no records to update');
    }

    const recordsByPrmKey: string[] = foundRecords.map(record => {
      return record[this.primaryKey];
    });
    // console.log(recordsByPrmKey);

    const updateBody = Object.keys(updateArgs).map(
      colStr => `${colStr} = @${colStr}`
    );
    const whereBody = Object.keys(whereArgs).map(
      colStr => `${colStr} = @${colStr}`
    );

    const updateStr = `UPDATE ${this.tableName} SET ${updateBody.join(', ')}
    WHERE ${whereBody.join(' AND ')}`;

    const update = db.prepare(updateStr);
    let changes = 0;

    // Source: https://github.com/JoshuaWise/better-sqlite3/issues/49
    const begin = db.prepare('BEGIN');
    const commit = db.prepare('COMMIT');
    const rollback = db.prepare('ROLLBACK');
    begin.run();
    try {
      for (const prmKey of recordsByPrmKey) {
        const sqlArgs = { ...updateArgs, [this.primaryKey]: prmKey };

        update.run(sqlArgs);
        changes += 1;
      }
      commit.run();
    } catch (e) {
      const errMsg = `could not run bulk update \n ${e}`;
      console.warn(errMsg);

      rollback.run();
      return { changes: 0, error: errMsg };
    }

    return { changes };
  }

  // TODO:
  // public remove(queryArgs = {}) {
  //   // TODO:
  // }

  /** ========= count() =========
   *
   */
  public count(): number {
    const countQuery = Model.db.prepare(
      `SELECT COUNT(id) FROM ${this.tableName}`
    );

    const { 'COUNT(id)': numRecord } = countQuery.get();

    return numRecord;
  }

  /** ===== VALIDATE QUERY ARGS ====
   * TODO later
   * simple validation that ensures all queryArgs exist as column/fields & runs isValideFn
   * NOTE: not really necessary since sqlite3 will throw us an error :)
   * @param queryArgs
   */
  // NOTE: can pass in function.name && tableName too
  public __validateQueryArgs(queryArgs = {}): void {
    for (const argKey in queryArgs) {
      if (!Object.prototype.hasOwnProperty.call(this.fields, argKey)) {
        // ErrorType: extra arg that is not related to any field
        throw new Error(
          `add a new record was provided a key of "${argKey}" that is not associated with any field on the table "${
            this.tableName
          }"`
        );
      }

      // Checks if theres a validator fn for each column type & runs it
      const { isValidFn } = this.fields[argKey];

      if (isValidFn && !isValidFn(queryArgs[argKey])) {
        // ErrorType: arg failed validation
        throw new Error(
          `provided argument of "${queryArgs[argKey]}" failed validation`
        );
      }
    }

    // ===== Ensure no primary keys ======
    // TODO: FIX: right now it is checking to see if all required fields
    // are in the queryARgs (notNull values)! useful for creation but not updating
    // if (false) {
    //   // 1) figure out what the required params are:
    //   // Map through the Fields & filter for
    //   // fields that are isNotNull == true && isPrimaryKey == false
    //   const reqFields = Object.keys(this.fields).filter(field => {
    //     const { isPrimaryKey, isNotNull } = this.fields[field];
    //     // Note: since primary key will autoincrement, never allow users to
    //     // specify primary key when adding a new record
    //     return isPrimaryKey ? false : isNotNull;
    //   });

    //   // 2) determine that the given args has those required params
    //   for (const field of reqFields) {
    //     if (!Object.prototype.hasOwnProperty.call(queryArgs, field)) {
    //       // ErrorType: missing required field
    //       throw new Error(
    //         `cannot add a new record in table "${
    //           this.tableName
    //         }" because you are missing an argument of "${field}"`
    //       );
    //     }
    //   }
    // }
  }
}
