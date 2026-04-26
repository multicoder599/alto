const express = require('express');
const cors = require('cors');
const fs = require('fs');
const cron = require('node-cron');
const path = require('path');

const app = express();
app.use(cors()); // Allows your website to talk to this server
app.use(express.json());

const DB_FILE = path.join(__dirname, 'database.json');

// --- Helper Function: Read DB ---
function readDB() {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Error reading DB:", err);
        return { yesterday: [], today: [], tomorrow: [] };
    }
}

// --- Helper Function: Write DB ---
function writeDB(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error writing DB:", err);
    }
}

// --- API ROUTES ---

// GET: Send data to the main website and admin panel
app.get('/api/tips', (req, res) => {
    const db = readDB();
    res.json(db);
});

// POST: Save new data from the Admin Panel
app.post('/api/tips', (req, res) => {
    const newData = req.body;
    writeDB(newData);
    res.json({ message: 'Database updated successfully!' });
});

// --- THE MIDNIGHT AUTOMATION (CRON JOB) ---
// This runs every day exactly at 00:00 (Midnight) server time.
cron.schedule('0 0 * * *', () => {
    console.log('Running Midnight Rollover Automation...');
    
    let db = readDB();

    // 1. Move "Today's" games to "Yesterday"
    // We map them to automatically add a 'pending' status
    const movedGames = db.today.map(game => ({
        ...game,
        s: 'pending', // Add status field for the Admin to update later
        r: 'TBD'      // Result To Be Determined
    }));

    // Replace whatever was in yesterday with the games that just finished today
    db.yesterday = movedGames;

    // 2. Empty the "Today" array
    db.today = [];

    // Note: If you want 'tomorrow' games to move to 'today', you can add that logic here too:
    // db.today = db.tomorrow;
    // db.tomorrow = [];

    // 3. Save the updated database
    writeDB(db);
    console.log('Midnight Rollover Complete. Today is now empty.');
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Alto Tips Server running on http://localhost:${PORT}`);
});