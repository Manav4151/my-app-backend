
import { connect } from "mongoose";

import dotenv from "dotenv";
dotenv.config();

export async function connectDB() {
    try {
        const mongoUrl = process.env.MONGODB_URL || "mongodb://127.0.0.1:27017";
        const dbName = process.env.MONGODB_NAME || "demo";
        await connect(`${mongoUrl}/${dbName}`);
        console.log("✅ MongoDB Connected");
    } catch (err) {
        console.error("❌ MongoDB Connection Error:", err.message);
        process.exit(1);
    }
};

