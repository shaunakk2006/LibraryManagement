//load books when the website opens
document.addEventListener("DOMContentLoaded", () => {
    loadBooks();

    //search automatically when the user types
    document.getElementById("search")
        .addEventListener("input", loadBooks);

    //log out when the button is clicked
    document.getElementById("logoutButton")
        .addEventListener("click", logout);
});

//retrieve books from the backend
async function loadBooks() {
    const search = document.getElementById("search").value;
    const bookList = document.getElementById("bookList");

    try {
        const response = await fetch(
            "/api/books?search=" + encodeURIComponent(search)
        );

        if (!response.ok) {
            throw new Error("Unable to load books");
        }

        const books = await response.json();

        //clear the previous results
        bookList.replaceChildren();

        if (books.length === 0) {
            bookList.textContent = "No books found.";
            return;
        }

        //display each book
        books.forEach(book => {
            const card = document.createElement("div");
            card.className = "book";

            const title = document.createElement("h3");
            title.textContent = book.title;

            const author = document.createElement("p");
            author.textContent = "Author: " + book.author;

            const status = document.createElement("p");
            status.textContent = book.available
                ? "Available"
                : "Borrowed";

            const button = document.createElement("button");
            button.textContent = book.available
                ? "Borrow"
                : "Return";

            button.addEventListener("click", () => {
                updateBook(book.id, book.available);
            });

            //create a review input
            const reviewInput = document.createElement("input");
            reviewInput.placeholder = "Write a review";
            reviewInput.maxLength = 500;

            //create a submit review button
            const reviewButton = document.createElement("button");
            reviewButton.textContent = "Submit Review";

            //create an area to display reviews
            const reviewList = document.createElement("div");

            //submit a review
            reviewButton.addEventListener("click", async () => {
                const review = reviewInput.value.trim();

                if (review === "") {
                    alert("Please write a review.");
                    return;
                }

                try {
                    const response = await fetch("/api/reviews", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            bookId: book.id,
                            review: review
                        })
                    });

                    if (!response.ok) {
                        throw new Error("Unable to save review");
                    }

                    reviewInput.value = "";
                    await loadReviews(book.id, reviewList);

                } catch (error) {
                    alert("Unable to save review.");
                    console.error(error);
                }
            });

            //add everything to the book card
            card.append(
                title,
                author,
                status,
                button,
                reviewInput,
                reviewButton,
                reviewList
            );

            bookList.appendChild(card);

            //display existing reviews
            loadReviews(book.id, reviewList);
        });

    } catch (error) {
        bookList.textContent = "Unable to load books.";
        console.error(error);
    }
}

//borrow or return a book
async function updateBook(id, available) {
    const action = available ? "borrow" : "return";

    try {
        const response = await fetch("/api/" + action, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ id: id })
        });

        if (!response.ok) {
            throw new Error("Unable to update book");
        }

        //refresh the book list
        await loadBooks();

    } catch (error) {
        alert("Unable to update book.");
        console.error(error);
    }
}

//display reviews for a book
async function loadReviews(bookId, reviewList) {
    try {
        const response = await fetch("/api/reviews/" + bookId);

        if (!response.ok) {
            throw new Error("Unable to load reviews");
        }

        const reviews = await response.json();

        //clear previous reviews
        reviewList.replaceChildren();

        reviews.forEach(review => {
            const paragraph = document.createElement("p");

            //insecure because review content is treated as HTML which could allow XSS attacks
            paragraph.innerHTML =
                review.username + ": " + review.review;

            reviewList.appendChild(paragraph);
        });

    } catch (error) {
        console.error(error);
    }
}

//log out the user
async function logout() {
    try {
        const response = await fetch("/api/logout", {
            method: "POST"
        });

        if (!response.ok) {
            throw new Error("Unable to log out");
        }

        //return to the login page
        window.location.href = "/login.html";

    } catch (error) {
        alert("Unable to log out.");
        console.error(error);
    }
}
