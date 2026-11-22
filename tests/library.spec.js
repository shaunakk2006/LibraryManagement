const { test, expect } = require("@playwright/test");
const url = "http://localhost:8080";

//test that the registration page opens
test("Registration page loads", async ({ page }) => {
    await page.goto(url);

    await expect(page).toHaveURL(url + "/");
});

//test that the login page opens
test("Login page loads", async ({ page }) => {
    await page.goto(url + "/login.html");

    await expect(page).toHaveURL(url + "/login.html");
});

//test that an incorrect login is rejected
test("Incorrect login is rejected", async ({ request }) => {
    const response = await request.post(url + "/api/login", {
        data: {
            username: "wronguser",
            password: "wrongpassword"
        }
    });

    expect(response.status()).toBe(401);
});

//test that a new user can register
test("User registration", async ({ request }) => {
    const username = "testuser" + Date.now();

    const response = await request.post(url + "/api/register", {
        data: {
            username: username,
            password: "TestPassword123!"
        }
    });

    expect(response.status()).toBe(201);
});

//test that a user can log in
test("Successful login", async ({ request }) => {
    const username = "testuser" + Date.now();
    const password = "TestPassword123!";

    //create a test account
    await request.post(url + "/api/register", {
        data: { username, password }
    });

    //log in with the test account
    const response = await request.post(url + "/api/login", {
        data: { username, password }
    });

    expect(response.status()).toBe(200);
});

//test that users must log in to view books
test("Books require login", async ({ request }) => {
    const response = await request.get(url + "/api/books");

    expect(response.status()).toBe(401);
});

//test that a logged-in user can search for books
test("Search for books", async ({ request }) => {
    const username = "testuser" + Date.now();
    const password = "TestPassword123!";

    await request.post(url + "/api/register", {
        data: { username, password }
    });

    await request.post(url + "/api/login", {
        data: { username, password }
    });

    const response = await request.get(url + "/api/books?search=Harry");

    expect(response.status()).toBe(200);
    expect(Array.isArray(await response.json())).toBe(true);
});

//test that borrowing without a CSRF token is rejected
test("Borrow requires CSRF token", async ({ request }) => {
    const username = "testuser" + Date.now();
    const password = "TestPassword123!";

    await request.post(url + "/api/register", {
        data: { username, password }
    });

    await request.post(url + "/api/login", {
        data: { username, password }
    });

    const response = await request.post(url + "/api/borrow", {
        data: { id: 1 }
    });

    expect(response.status()).toBe(403);
});

//test that private user information is protected
test("Private user information is blocked", async ({ request }) => {
    const response = await request.get(url + "/api/users");

    expect(response.status()).toBe(403);
});

//test that logout ends the session
test("User logout", async ({ request }) => {
    const username = "testuser" + Date.now();
    const password = "TestPassword123!";

    await request.post(url + "/api/register", {
        data: { username, password }
    });

    await request.post(url + "/api/login", {
        data: { username, password }
    });

    //get the CSRF token
    const tokenResponse = await request.get(url + "/api/csrf-token");
    const tokenData = await tokenResponse.json();

    //log out
    const response = await request.post(url + "/api/logout", {
        headers: {
            "X-CSRF-Token": tokenData.csrfToken
        }
    });

    expect(response.status()).toBe(200);

    //check that the user can no longer access books
    const booksResponse = await request.get(url + "/api/books");

    expect(booksResponse.status()).toBe(401);
});
