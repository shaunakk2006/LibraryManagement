
// Load books when the website opens.
document.addEventListener("DOMContentLoaded", () => {
    loadBooks();

    // Search automatically when the user types.
    document.getElementById("search")
        .addEventListener("input", loadBooks);
});

// Retrieve books from the Java backend.
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

        // Clear the previous results.
        bookList.replaceChildren();

        if (books.length === 0) {
            bookList.textContent = "No books found.";
            return;
        }

        // Display each book.
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

            card.append(title, author, status, button);
            bookList.appendChild(card);
        });

    } catch (error) {
        bookList.textContent = "Unable to load books.";
        console.error(error);
    }
}

// Borrow or return a book.
async function updateBook(id, available) {
    const action = available ? "borrow" : "return";

    try {
        const response = await fetch("/api/" + action, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({ id: id })
        });

        if (!response.ok) {
            throw new Error("Unable to update book");
        }

        // Refresh the book list.
        await loadBooks();

    } catch (error) {
        alert("Unable to update book.");
        console.error(error);
    }
}
