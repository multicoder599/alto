const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const mongoose = require('mongoose');

const app = express();

// Enable CORS so your external frontend can communicate with this backend API
app.use(cors());
app.use(express.json());

// --- MONGODB CONNECTION ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://newtonmulti_db_user:DiLL4F0vUSVDfybz@cluster15.fomjqmp.mongodb.net/alto?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- MONGODB SCHEMA ---
const tipsSchema = new mongoose.Schema({
    identifier: { type: String, default: 'main' },
    yesterday: { type: Array, default: [] },
    today: { type: Array, default: [] },
    tomorrow: { type: Array, default: [] }
});

const Tips = mongoose.model('Tips', tipsSchema);

// --- API ROUTES ---

// GET: Send data to the main website and admin panel
app.get('/api/tips', async (req, res) => {
    try {
        let db = await Tips.findOne({ identifier: 'main' });
        
        // If the database is completely empty (first time running), create the default structure
        if (!db) {
            db = await Tips.create({ identifier: 'main', yesterday: [], today: [], tomorrow: [] });
        }
        
        res.json(db);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch tips' });
    }
});

// POST: Save new data from the Admin Panel
app.post('/api/tips', async (req, res) => {
    try {
        const { yesterday, today, tomorrow } = req.body;
        
        // Find the main document and update it, or create it if it doesn't exist (upsert)
        await Tips.findOneAndUpdate(
            { identifier: 'main' },
            { yesterday, today, tomorrow },
            { upsert: true, new: true }
        );
        
        res.json({ message: 'Database updated successfully!' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save tips' });
    }
});

// --- THE MIDNIGHT AUTOMATION (CRON JOB) ---
// Runs every day exactly at 00:00 (Midnight) server time.
cron.schedule('0 0 * * *', async () => {
    console.log('Running Midnight Rollover Automation...');
    
    try {
        let db = await Tips.findOne({ identifier: 'main' });
        if (!db) return;

        // 1. Move "Today's" games to "Yesterday" & mark as pending
        const movedGames = db.today.map(game => ({
            ...game,
            s: 'pending', // Status for Admin to update
            r: 'TBD'      // Result To Be Determined
        }));

        db.yesterday = movedGames;

        // 2. Empty the "Today" array
        db.today = [];

        // 3. Save the updated document to MongoDB
        await db.save();
        console.log('✅ Midnight Rollover Complete. Today is now empty.');
    } catch (err) {
        console.error('❌ Midnight Rollover Failed:', err);
    }
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Alto Tips API Server running on port ${PORT}`);
}); 