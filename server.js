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
//use Node.js to securely hash passwords
const crypto = require("crypto");

//display registration page when website opens
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "register.html"));
});

//display the library after registration or login
app.get("/index.html", (req, res) => {
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

 //hash a password before storing it
function hashPassword(password, salt) {
    return crypto.scryptSync(password, salt, 64).toString("hex");
}

//register a new account
app.post("/api/register", (req, res) => {
    const { username, password } = req.body;

    //check that the details are valid
    if (typeof username !== "string" ||
        typeof password !== "string" ||
        username.trim().length < 3 ||
        username.length > 50 ||
        password.length < 12 ||
        password.length > 128) {
        return res.status(400).json({
            error: "Enter a valid username and password (minimum 12 characters)."
        });
    }

    //create a random salt for the password
    const salt = crypto.randomBytes(16).toString("hex");

    //hash the password
    const hash = hashPassword(password, salt);

    //store the salt and hash together
    const passwordHash = salt + ":" + hash;

    //save the new account
    database.registerUser(username.trim(), passwordHash, (err) => {
        if (err) {
            if (err.code === "SQLITE_CONSTRAINT") {
                return res.status(409).json({
                    error: "Username already exists."
                });
            }

            return res.status(500).json({
                error: "Unable to register."
            });
        }

        res.status(201).json({
            message: "Account registered successfully."
        });
    });
});

 //display the registration page
app.get("/register.html", (req, res) => {
    res.sendFile(path.join(__dirname, "register.html"));
});

//load the registration JavaScript
app.get("/register.js", (req, res) => {
    res.sendFile(path.join(__dirname, "register.js"));
});

 //display the login page
app.get("/login.html", (req, res) => {
    res.sendFile(path.join(__dirname, "login.html"));
});

//load the login JavaScript
app.get("/login.js", (req, res) => {
    res.sendFile(path.join(__dirname, "login.js"));
});

//login an existing user
app.post("/api/login", (req, res) => {
    const { username, password } = req.body || {};

    //check that details were entered
    if (typeof username !== "string" ||
        typeof password !== "string") {
        return res.status(400).json({
            error: "Invalid login details."
        });
    }

    //find the user in the database
    database.getUser(username, (err, user) => {
        if (err) {
            return res.status(500).json({
                error: "Database error."
            });
        }

        if (!user) {
            return res.status(401).json({
                error: "Invalid username or password."
            });
        }

        //separate the saved salt and password hash
        const [salt, savedHash] = user.password_hash.split(":");

        //hash the entered password using the saved salt
        const enteredHash = crypto.scryptSync(password, salt, 64);

        const savedHashBuffer = Buffer.from(savedHash, "hex");

        //compare the password hashes
        if (savedHashBuffer.length !== enteredHash.length ||
            !crypto.timingSafeEqual(savedHashBuffer, enteredHash)) {
            return res.status(401).json({
                error: "Invalid username or password."
            });
        }

        res.json({
            message: "Login successful."
        });
    });
});

//start the website
app.listen(PORT, () => {
    console.log(`Website running at http://localhost:${PORT}`);
});
