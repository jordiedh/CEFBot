const sqlite3 = require('sqlite3');
export const db = new sqlite3.Database('./data.db');

export async function dbAll(query, values) {
    return new Promise(function(resolve, reject) {
        db.all(query, values, function(err,rows) {
           if(err) return reject(err);
           resolve(rows);
         });
    });
}

export async function dbGet(query, values) {
    return new Promise(function(resolve,reject) {
        db.get(query, values, function(err,row) {
           if(err) return reject(err);
           resolve(row);
         });
    });
}