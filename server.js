//Import Express to create the web server
const express = require("express");

//import path to locate website files
const path = require("path");

//import the database functions from database.js
const database = require("./database");

//create the Express application
const app = express();

//set the port number for the website
const PORT = 8080;
//allow the server to receive JSON data
app.use(express.json());

//display the main website
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

//load the CSS file
app.get("/style.css", (req, res) => {
    res.sendFile(path.join(__dirname, "style.css"));
});

//load the JavaScript file
app.get("/script.js", (req, res) => {
    res.sendFile(path.join(__dirname, "script.js"));
});

//get the list of books
app.get("/api/books", (req, res) => {
    const search = req.query.search || "";

    //check that the search is valid
    if (typeof search !== "string") {
        return res.status(400).json({ error: "Invalid search" });
    }

    database.getBooks(search, (err, books) => {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }

        res.json(books);
    });
});

//borrow a book
app.post("/api/borrow", (req, res) => {
    changeBookStatus(req, res, 0, 1);
});

//return a book
app.post("/api/return", (req, res) => {
    changeBookStatus(req, res, 1, 0);
});

//update a book's availability
function changeBookStatus(req, res, newStatus, oldStatus) {
    const id = req.body.id;

    //check that the book ID is valid
    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({ error: "Invalid book ID" });
    }

    database.updateBook(id, newStatus, oldStatus, (err, changes) => {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }

        //check whether the book was updated
        if (changes === 0) {
            return res.status(409).json({
                error: "Book not found or already updated"
            });
        }

        res.json({ message: "Book updated successfully" });
    });
}

//start the website
app.listen(PORT, () => {
    console.log(`Website running at http://localhost:${PORT}`);
});
