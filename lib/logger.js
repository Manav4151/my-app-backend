import winston from "winston";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define colors for different log levels
const colors = {
    error: "red",
    warn: "yellow",
    info: "green",
    http: "magenta",
    debug: "blue",
};

// Add colors to winston
winston.addColors(colors);

// Custom formatter for console output
const consoleFormat = winston.format.printf(
    ({ level, message, timestamp, ...metadata }) => {
        let log = "";

        // Add timestamp
        log += chalk.gray(`[${timestamp}] `);

        // Add colored log level
        const color = colors[level] || "white";
        log += chalk[color].bold(`${level.toUpperCase()}:`.padEnd(7));

        // Add message
        if (typeof message === "object") {
            log += "\n" + JSON.stringify(message, null, 2);
        } else {
            log += message;
        }

        // Add metadata if exists
        if (Object.keys(metadata).length > 0) {
            log += "\n" + JSON.stringify(metadata, null, 2);
        }

        return log;
    }
);

// Create a logger instance
export const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.json()
    ),
    transports: [
        // Write all logs to combined.log
        new winston.transports.File({
            filename: path.join(__dirname, "../logs/combined.log"),
        }),
        // Write error logs to error.log
        new winston.transports.File({
            filename: path.join(__dirname, "../logs/error.log"),
            level: "error",
        }),
    ],
});

// If we're not in production, log to console with colors
if (process.env.NODE_ENV !== "production") {
    logger.add(
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp({ format: "HH:mm:ss" }),
                winston.format.colorize({ all: true }),
                consoleFormat
            ),
        })
    );
}

/**
 * Logs user activity
 * @param {Object} req - Express request object
 * @param {string} activity - Description of the activity
 * @param {Object} [metadata] - Additional metadata to log
 * @param {string} [level=info] - Log level (info, warn, error)
 */
export const logActivity = (req, activity, metadata = {}, level = "info") => {
    const logData = {
        userId: req.user?.id || "anonymous",
        method: req.method,
        path: req.path,
        activity,
        ip: req.ip,
        userAgent: req.get("user-agent") || "server",
        ...metadata,
    };

    logger.log(level, activity, logData);
};
