const sqlite3 = require("sqlite3").verbose();

//connect to the SQLite database
const db = new sqlite3.Database("./library.db", (err) => {
    if (err) {
        console.error("Database connection failed.");
    } else {
        console.log("Connected to SQLite database.");
    }
});

//create the books table
db.run(`
    CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        available INTEGER NOT NULL DEFAULT 1
    )
`);

//get all books or search for a book
function getBooks(search, callback) {
    const sql = `
        SELECT * FROM books
        WHERE title LIKE ? OR author LIKE ?
    `;

    //parameters prevent SQL injection
    db.all(sql, [`%${search}%`, `%${search}%`], callback);
}

//change whether a book is available
function updateBook(id, newStatus, oldStatus, callback) {
    const sql = `
        UPDATE books
        SET available = ?
        WHERE id = ? AND available = ?
    `;

    //only update a book with the correct ID and status
    db.run(sql, [newStatus, id, oldStatus], function (err) {
        callback(err, this ? this.changes : 0);
    });
}

//export the functions so server.js can use them
module.exports = {
    getBooks,
    updateBook
};

