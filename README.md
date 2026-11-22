This is my Project for my Secure Application Programming Module. I have created a Library Management System, allowing users to login/create an account, borrow/return a book, and review a book.

Technologies used: 
HTML, CSS, JavaScript, JSON
Node.js
Express.js
SQLite3
Playwright
OWASP ZIP

Branches:
main: main project branch.
insecure: intentionally made vulnerable code.
secure: fixing the vulnerabilities from insecure.

How to run the project:
1. Download the repository, and open the folder in VS Code.
2. Open terminal and switch to the secure branch: git switch secure
3. You must set a session secret and start the server: $env:SESSION_SECRET = (New-Guid).Guid + (New-Guid).Guid
node server.js
4. Open http://localhost:8080 in your browser.

How to Carry out Testing:
1. Open the library.spec.js file.
2. Switch to the secure branch: git switch secure
3. Have the server running in a terminal: $env:SESSION_SECRET = (New-Guid).Guid + (New-Guid).Guid
node server.js
4. Open a new terminal and type: npx.cmd playwright test
5. In the terminal it will show whether the system has passed/failed the tests.

