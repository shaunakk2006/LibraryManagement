//login an existing user
document.getElementById("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    //get the login details
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const message = document.getElementById("message");

    try {
        //send login details to the server
        const response = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        //go to the library if login succeeds
        if (response.ok) {
            window.location.href = "/index.html";
        } else {
            message.textContent = result.error;
        }

    } catch (error) {
        message.textContent = "Unable to login.";
        console.error(error);
    }
});
