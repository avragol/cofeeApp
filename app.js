const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const port = 3000;

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

        const date = new Date();
        const yyyy = date.getFullYear();
        const mm = date.getMonth() + 1;
        const dd = date.getDate();

        turn.history.unshift(`${turn.currentTurn} - ${dd}.${mm}.${yyyy}`);

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

        const date = new Date();
        const yyyy = date.getFullYear();
        const mm = date.getMonth() + 1;
        const dd = date.getDate();

        turn.history.unshift(`${name} (התנדב) - ${dd}.${mm}.${yyyy}`);
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

app.post('/api/rate-coffee', async (req, res, next) => {
    try {
        const { name, rating } = req.body;
        let turn = await Turn.findOne();
        if (!turn) {
            return res.status(404).json({ error: 'Turn not found' });
        }

        let currentPoints = turn.points.get(name) || 0;
        if (rating === '1') {
            currentPoints -= 1;
        } else if (rating === '3') {
            currentPoints += 1;
        }
        turn.points.set(name, currentPoints);

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