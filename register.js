//register a new user
document.getElementById("registerForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    //get the username and password
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const message = document.getElementById("message");

    try {
        //send account creation details to the server
        const response = await fetch("/api/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();
        //go to the library if registration succeeds
        if (response.ok) {
            window.location.href = "/index.html";
        } else {
            message.textContent = result.error;
        }

    } catch (error) {
        message.textContent = "Unable to register.";
        console.error(error);
    }
});
