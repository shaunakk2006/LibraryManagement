//import Express to create the web server
const express = require("express");

//import path to locate website files
const path = require("path");

//import database functions
const database = require("./database");

//import session management
const session = require("express-session");

//use Node.js to securely hash passwords
const crypto = require("crypto");

//create the Express application
const app = express();

//set the website port
const PORT = 8080;

//allow the server to receive JSON data
app.use(express.json());

//check that a session secret exists
if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is not set.");
}

//remember logged-in users
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax"
    }
}));

//check whether a user is logged in
function requireLogin(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({
            error: "Please log in."
        });
    }

    next();
}

//display registration page when website opens
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "register.html"));
});

//display the library only for logged-in users
app.get("/index.html", (req, res) => {
    if (!req.session.userId) {
        return res.redirect("/login.html");
    }

    res.sendFile(path.join(__dirname, "index.html"));
});

//load the CSS file
app.get("/style.css", (req, res) => {
    res.sendFile(path.join(__dirname, "style.css"));
});

//load the library JavaScript
app.get("/script.js", (req, res) => {
    res.sendFile(path.join(__dirname, "script.js"));
});

//display the registration page
app.get("/register.html", (req, res) => {
    res.sendFile(path.join(__dirname, "register.html"));
});

//load registration JavaScript
app.get("/register.js", (req, res) => {
    res.sendFile(path.join(__dirname, "register.js"));
});

//display the login page
app.get("/login.html", (req, res) => {
    res.sendFile(path.join(__dirname, "login.html"));
});

//load login JavaScript
app.get("/login.js", (req, res) => {
    res.sendFile(path.join(__dirname, "login.js"));
});

//get the list of books
app.get("/api/books", requireLogin, (req, res) => {
    const search = req.query.search || "";

    //check that the search is valid
    if (typeof search !== "string") {
        return res.status(400).json({
            error: "Invalid search"
        });
    }

    database.getBooks(search, (err, books) => {
        if (err) {
            return res.status(500).json({
                error: "Database error"
            });
        }

        res.json(books);
    });
});

//borrow a book
app.post("/api/borrow", requireLogin, (req, res) => {
    changeBookStatus(req, res, 0, 1);
});

//return a book
app.post("/api/return", requireLogin, (req, res) => {
    changeBookStatus(req, res, 1, 0);
});

//update a book's availability
function changeBookStatus(req, res, newStatus, oldStatus) {
    const id = req.body.id;

    //check that the book ID is valid
    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({
            error: "Invalid book ID"
        });
    }

    database.updateBook(id, newStatus, oldStatus, (err, changes) => {
        if (err) {
            return res.status(500).json({
                error: "Database error"
            });
        }

        //check whether the book was updated
        if (changes === 0) {
            return res.status(409).json({
                error: "Book not found or already updated"
            });
        }

        res.json({
            message: "Book updated successfully"
        });
    });
}

//hash a password before storing it
function hashPassword(password, salt) {
    return crypto.scryptSync(password, salt, 64).toString("hex");
}

//register a new account
app.post("/api/register", (req, res) => {
    const { username, password } = req.body || {};

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

        //create a new session after successful login
        req.session.regenerate((err) => {
            if (err) {
                return res.status(500).json({
                    error: "Login failed."
                });
            }

            //remember which user logged in
            req.session.userId = user.id;

            req.session.save((err) => {
                if (err) {
                    return res.status(500).json({
                        error: "Login failed."
                    });
                }

                res.json({
                    message: "Login successful."
                });
            });
        });
    });
});

//log out the user
app.post("/api/logout", requireLogin, (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                error: "Logout failed."
            });
        }

        res.clearCookie("connect.sid");

        res.json({
            message: "Logged out."
        });
    });
});

//save a review from a logged-in user
app.post("/api/reviews", requireLogin, (req, res) => {
    const { bookId, review } = req.body || {};

    //check the review details
    if (!Number.isSafeInteger(bookId) ||
        bookId <= 0 ||
        typeof review !== "string" ||
        review.trim().length === 0 ||
        review.length > 500) {
        return res.status(400).json({
            error: "Invalid review."
        });
    }

    //save the review with the logged-in user's ID
    database.addReview(
        bookId,
        req.session.userId,
        review.trim(),
        (err) => {
            if (err) {
                return res.status(500).json({
                    error: "Unable to save review."
                });
            }

            res.json({
                message: "Review added."
            });
        }
    );
});

//get reviews for a book
app.get("/api/reviews/:bookId", requireLogin, (req, res) => {
    const bookId = Number(req.params.bookId);

    //check the book ID
    if (!Number.isSafeInteger(bookId) || bookId <= 0) {
        return res.status(400).json({
            error: "Invalid book ID."
        });
    }

    database.getReviews(bookId, (err, reviews) => {
        if (err) {
            return res.status(500).json({
                error: "Unable to load reviews."
            });
        }

        res.json(reviews);
    });
});

    //insecure because user input is displayed as HTML
    app.get("/search-example", (req, res) => {  //creates a webpage at /search-example that displays the search query directly in the HTML
        const search = req.query.search || "";

        res.send("Search: " + search);
    });
//start the website
app.listen(PORT, () => {
    console.log(`Website running at http://localhost:${PORT}`);
});
