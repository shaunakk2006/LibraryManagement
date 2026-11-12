
import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

public class LibraryServer {

    public static void main(String[] args) throws IOException {

        //create the website on port 8080
        HttpServer server = HttpServer.create(
            new InetSocketAddress("localhost", 8080), 0
        );

        //load the HTML page
        server.createContext("/", exchange ->
            serveFile(exchange, "index.html", "text/html")
        );

        //load the CSS file
        server.createContext("/style.css", exchange ->
            serveFile(exchange, "style.css", "text/css")
        );

        //load the JavaScript file
        server.createContext("/script.js", exchange ->
            serveFile(exchange, "script.js", "text/javascript")
        );

        //get books from the database
        server.createContext("/api/books", exchange -> {

            //only allow GET requests
            if (!exchange.getRequestMethod().equals("GET")) {
                sendResponse(exchange, 405, "Method not allowed", "text/plain");
                return;
            }

            //get what the user searched for
            String search = getParameter(
                exchange.getRequestURI().getRawQuery(), "search"
            );

            //find books matching the title or author
            String sql = """
                SELECT id, title, author, available
                FROM books
                WHERE title LIKE ? OR author LIKE ?
                """;

            //store the books as JSON
            StringBuilder json = new StringBuilder("[");
            boolean first = true;

            try (Connection conn = Database.connect();
                 PreparedStatement stmt = conn.prepareStatement(sql)) {

                String value = "%" + search + "%";
                //add the search value safely to the SQL query
                stmt.setString(1, value);
                stmt.setString(2, value);

                //run the query
                try (ResultSet rs = stmt.executeQuery()) {
                    //go through each book
                    while (rs.next()) {
                        //separate books with commas
                        if (!first) {
                            json.append(",");
                        }
                        first = false;
                        //add the book details to JSON
                        json.append("{");

                        json.append("\"id\":")
                            .append(rs.getInt("id")).append(",");

                        json.append("\"title\":\"")
                            .append(jsonEscape(rs.getString("title")))
                            .append("\",");

                        json.append("\"author\":\"")
                            .append(jsonEscape(rs.getString("author")))
                            .append("\",");

                        json.append("\"available\":")
                            .append(rs.getBoolean("available"));

                        json.append("}");
                    }
                }

                //finish the JSON list
                json.append("]");
                //send the books to JavaScript
                sendResponse(exchange, 200, json.toString(), "application/json");

            } catch (Exception e) {
                //show an error if the database fails
                e.printStackTrace();
                sendResponse(exchange, 500, "Database error", "text/plain");
            }
        });

        //borrow a book
        server.createContext("/api/borrow", exchange ->
            updateBook(exchange, false)
        );
        //return a book
        server.createContext("/api/return", exchange ->
            updateBook(exchange, true)
        );
        //start the server
        server.start();
        System.out.println("Website running at http://localhost:8080");
    }

    //load a website file
    private static void serveFile(
        HttpExchange exchange, String filename, String contentType
    ) throws IOException {
        //only allow GET requests
        if (!exchange.getRequestMethod().equals("GET")) {
            sendResponse(exchange, 405, "Method not allowed", "text/plain");
            return;
        }
        try {
            //read the file
            byte[] data = Files.readAllBytes(Path.of(filename));

            //set the file type
            exchange.getResponseHeaders().set(
                "Content-Type", contentType + "; charset=UTF-8"
            );

            //send the file to the browser
            exchange.sendResponseHeaders(200, data.length);

            try (OutputStream os = exchange.getResponseBody()) {
                os.write(data);
            }

        } catch (IOException e) {
            //show an error if the file is missing
            sendResponse(exchange, 404, "File not found", "text/plain");
        }
    }
    //borrow or return a book
    private static void updateBook(
        HttpExchange exchange, boolean available
    ) throws IOException {
        //only allow POST requests
        if (!exchange.getRequestMethod().equals("POST")) {
            sendResponse(exchange, 405, "Method not allowed", "text/plain");
            return;
        }
        //get the book ID sent by JavaScript
        String body = new String(
            exchange.getRequestBody().readAllBytes(),
            StandardCharsets.UTF_8
        );
        int id;
        try {
            //convert the book ID into a number
            id = Integer.parseInt(getParameter(body, "id"));
            // Check that the ID is valid
            if (id <= 0) {
                throw new NumberFormatException();
            }

        } catch (NumberFormatException e) {
            sendResponse(exchange, 400, "Invalid book ID", "text/plain");
            return;
        }
        //change the book to available or borrowed
        String sql = available
            ? "UPDATE books SET available = TRUE WHERE id = ? AND available = FALSE"
            : "UPDATE books SET available = FALSE WHERE id = ? AND available = TRUE";

        try (Connection conn = Database.connect();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            //choose which book to update
            stmt.setInt(1, id);
            //update the database
            int updated = stmt.executeUpdate();
            //check whether a book was updated
            if (updated == 0) {
                sendResponse(exchange, 409, "Book unavailable or not found", "text/plain");
                return;
            }
            //tell JavaScript the update worked
            sendResponse(exchange, 200, "Book updated", "text/plain");
        } catch (Exception e) {
            //show an error if the update fails
            e.printStackTrace();
            sendResponse(exchange, 500, "Database error", "text/plain");
        }
    }
    //get a value from a URL or form
    private static String getParameter(String query, String name) {
        //return empty text if there are no parameters
        if (query == null) return "";
        // Split the parameters
        for (String parameter : query.split("&")) {
            String[] parts = parameter.split("=", 2);
            String key = URLDecoder.decode(
                parts[0], StandardCharsets.UTF_8
            );
            //return the value we are looking for
            if (parts.length == 2 && key.equals(name)) {
                return URLDecoder.decode(
                    parts[1], StandardCharsets.UTF_8
                );
            }
        }
        return "";
    }
    //make text safe to include in JSON
    private static String jsonEscape(String value) {
        if (value == null) return "";
        StringBuilder escaped = new StringBuilder();
        //check each character
        for (char c : value.toCharArray()) {
            switch (c) {
                //handle quotation marks
                case '"' -> escaped.append("\\\"");
                //handle backslashes
                case '\\' -> escaped.append("\\\\");
                //handle new lines
                case '\n' -> escaped.append("\\n");
                case '\r' -> escaped.append("\\r");
                case '\t' -> escaped.append("\\t");
                //keep normal characters
                default -> {
                    if (c < 32) {
                        escaped.append(
                            String.format("\\u%04x", (int) c)
                        );
                    } else {
                        escaped.append(c);
                    }
                }
            }
        }

        return escaped.toString();
    }
    //send information back to the browser
    private static void sendResponse(
        HttpExchange exchange,
        int status,
        String content,
        String contentType
    ) throws IOException {
        //convert the response into bytes
        byte[] data = content.getBytes(StandardCharsets.UTF_8);
        //set the response type
        exchange.getResponseHeaders().set(
            "Content-Type", contentType + "; charset=UTF-8"
        );
        //send the response
        exchange.sendResponseHeaders(status, data.length);

        try (OutputStream os = exchange.getResponseBody()) {
            os.write(data);
        }
    }
}
