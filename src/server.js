import 'dotenv/config';
import express from 'express';
import categories from './routes/categories.js';
import matches from './routes/matches.js';
import users from './routes/users.js';
import questions from './routes/questions.js';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/categories', categories);
app.use('/api/matches', matches);
app.use('/api/users', users);
app.use('/api/questions', questions);

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`API on http://localhost:${PORT}`);
});
