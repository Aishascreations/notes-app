const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ── Database setup ──
const db = new Database('notes.db');

// Create the notes table if it doesn't exist yet
db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT DEFAULT '',
    body TEXT DEFAULT '',
    tag TEXT DEFAULT '',
    pinned INTEGER DEFAULT 0,
    createdAt TEXT,
    updatedAt TEXT
  )
`);

console.log('Database connected: notes.db');

// ── Routes ──

// GET all notes
app.get('/api/notes', (req, res) => {
  const { search, tag } = req.query;
  let query = 'SELECT * FROM notes';
  const params = [];

  if (search) {
    query += ' WHERE (title LIKE ? OR body LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (tag) {
    query += params.length ? ' AND tag = ?' : ' WHERE tag = ?';
    params.push(tag);
  }

  query += ' ORDER BY pinned DESC, updatedAt DESC';

  const notes = db.prepare(query).all(...params);

  // Convert pinned from 0/1 (SQLite) back to true/false
  res.json(notes.map(n => ({ ...n, pinned: n.pinned === 1 })));
});

// GET single note
app.get('/api/notes/:id', (req, res) => {
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  res.json({ ...note, pinned: note.pinned === 1 });
});

// POST create note
app.post('/api/notes', (req, res) => {
  const { title, body, tag, pinned } = req.body;
  const note = {
    id: uuidv4(),
    title: title || '',
    body: body || '',
    tag: tag || '',
    pinned: pinned ? 1 : 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.prepare(`
    INSERT INTO notes (id, title, body, tag, pinned, createdAt, updatedAt)
    VALUES (@id, @title, @body, @tag, @pinned, @createdAt, @updatedAt)
  `).run(note);

  res.status(201).json({ ...note, pinned: note.pinned === 1 });
});

// PUT update note
app.put('/api/notes/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Note not found' });

  const { title, body, tag, pinned } = req.body;
  const updated = {
    title: title !== undefined ? title : existing.title,
    body: body !== undefined ? body : existing.body,
    tag: tag !== undefined ? tag : existing.tag,
    pinned: pinned !== undefined ? (pinned ? 1 : 0) : existing.pinned,
    updatedAt: new Date().toISOString(),
    id: req.params.id,
  };

  db.prepare(`
    UPDATE notes SET title = @title, body = @body, tag = @tag,
    pinned = @pinned, updatedAt = @updatedAt WHERE id = @id
  `).run(updated);

  res.json({ ...updated, pinned: updated.pinned === 1 });
});

// DELETE note
app.delete('/api/notes/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Note not found' });
  db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});