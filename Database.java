import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class Database {

    // Location of the MySQL database
    private static final String URL =
        "jdbc:mysql://localhost:3306/library_db";

    // MySQL username
    private static final String USER = "root";

    // Get the MySQL password from the terminal
    private static final String PASSWORD =
        System.getenv("DB_PASSWORD");

    // Connect Java to the MySQL database
    public static Connection connect() throws SQLException {
        return DriverManager.getConnection(URL, USER, PASSWORD);
    }
}