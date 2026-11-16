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

 //create the books table
db.run(`
    CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        available INTEGER NOT NULL DEFAULT 1
    )
`, (err) => {
    if (err) {
        console.error("Error creating books table.");
        return;
    }

    //check if books already exist
    db.get("SELECT COUNT(*) AS total FROM books", (err, row) => {
        if (err) {
            console.error("Error checking books.");
            return;
        }

        //only add books if the table is empty
        if (row.total === 0) {
            const sql = "INSERT INTO books (title, author) VALUES (?, ?)";

            const books = [
                ["1984", "George Orwell"],
                ["To Kill a Mockingbird", "Harper Lee"],
                ["The Catcher in the Rye", "J.D. Salinger"],
                ["Lord of the Flies", "William Golding"],
                ["The Great Gatsby", "F. Scott Fitzgerald"]
                ["Mobey Dick", "Herman Melville"],
                ["Pride and Prejudice", "Jane Austen"],
                ["The Hobbit", "J.R.R. Tolkien"],
                ["Alice Adventures in Wonderland", "Lewis Carroll"],
                ["The Odyssey", "Homer"]
            ];

            //add each book to the database
            books.forEach((book) => {
                db.run(sql, book);
            });
        }
    });
});

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

