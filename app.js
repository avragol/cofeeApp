const express = require('express');
const mongoose = require('mongoose');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

const app = express();
const port = 3000;

const client_id = process.env.GOOGLE_CLIENT_ID
const client_secret = process.env.GOOGLE_CLIENT_SECRET
const client = new OAuth2Client(client_id, client_secret);

mongoose.connect(process.env.ATLAS_URL).then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('Failed to connect to MongoDB', err);
});

const Turn = mongoose.model('Turn', {
    currentTurn: String,
    queue: [{ name: String, skipTurns: Number }],
    history: [String],
    points: { type: Map, of: Number, default: {} }
});

app.use(express.static('public'));
app.use(express.json());

let tempCode = null;
const nameToEmailMap = {
    "חביבה": "haviva@wedev.co.il",
    "שני": "shani@wedev.co.il",
    "אברהם": "avraham@wedev.co.il"
};

/* router.get('api/google-login', (req, res) => {
    const redirect_uri = 'http://localhost:3000/google/google-callback';
    const authorizeUrl = client.generateAuthUrl({
        access_type: 'offline',
        scope: ['email'],
        redirect_uri: redirect_uri,
    });
    res.redirect(authorizeUrl);
}); */

/* router.get('/google-callback', async (req, res) => {
    const { code } = req.query;

    try {

        const redirect_uri = 'http://localhost:8181/google/google-callback';
        const { tokens } = await client.getToken({
            code: code,
            redirect_uri: redirect_uri,
        });

          const ticket = await client.verifyIdToken({
             idToken: tokens.id_token,
             audience: process.env.,
         });

        const payload = ticket.getPayload();
        console.log("payload from google: " + payload);
    } catch (error) {
        if (error.response.data) {
            const errorsValues = Object.values(error.response.data)
            handleError(res, `Google authentication error: ${errorsValues.join(" , ")}`, 500)
        } else {
            handleError(res, `Google authentication error: ${error}`, 500)
        }
    }
});
 */
app.get('/api/current-turn', async (req, res, next) => {
    try {
        let turn = await Turn.findOne();
        if (!turn) {
            turn = new Turn({
                currentTurn: 'אברהם',
                queue: [
                    { name: 'שני', skipTurns: 0 },
                    { name: 'חביבה', skipTurns: 0 },
                    { name: 'אברהם', skipTurns: 0 }
                ],
                history: [],
                points: new Map([['אברהם', 0], ['שני', 0], ['חביבה', 0]])
            });
            await turn.save();
        }
        res.json(turn);
    } catch (error) {
        next(error);
    }
});

app.post('/api/next-turn', async (req, res, next) => {
    try {
        let turn = await Turn.findOne();
        if (!turn) {
            return res.status(404).json({ error: 'Turn not found' });
        }

        turn.history.unshift(`${turn.currentTurn} - ${new Date().toLocaleDateString()}`);

        let nextPerson = turn.queue.shift();
        turn.currentTurn = nextPerson.name;
        turn.queue.push(nextPerson);

        await turn.save();
        res.json(turn);
    } catch (error) {
        next(error);
    }
});

app.post('/api/volunteer', async (req, res, next) => {
    try {
        const { name } = req.body;
        let turn = await Turn.findOne();
        if (!turn) {
            return res.status(404).json({ error: 'Turn not found' });
        }

        turn.history.unshift(`${name} (התנדב) - ${new Date().toLocaleDateString()}`);
        turn.points.set(name, (turn.points.get(name) || 0) + 1);

        const volunteerIndex = turn.queue.findIndex(p => p.name === name);
        if (volunteerIndex !== -1) {
            const [volunteer] = turn.queue.splice(volunteerIndex, 1);
            volunteer.skipTurns = 0;
            turn.queue.push(volunteer);
        }

        if (turn.currentTurn === name) {
            let nextPerson = turn.queue.shift();
            turn.currentTurn = nextPerson.name;
            turn.queue.push(nextPerson);
        }

        await turn.save();
        res.json(turn);
    } catch (error) {
        next(error);
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'An internal server error occurred' });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});