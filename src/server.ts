import 'dotenv/config';
import express from 'express';

const app = express();
app.use(express.json());

// Simple health endpoint
app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
