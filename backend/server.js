const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let notes = [];

app.get('/api/notes', (req, res) => {
  const { search, tag } = req.query;
  let result = [...notes];
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      (n.body || '').toLowerCase().includes(q)
    );
  }
  if (tag) result = result.filter(n => n.tag === tag);
  result.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  res.json(result);
});

app.get('/api/notes/:id', (req, res) => {
  const note = notes.find(n => n.id === req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  res.json(note);
});

app.post('/api/notes', (req, res) => {
  const { title, body, tag, pinned } = req.body;
  const note = {
    id: uuidv4(),
    title: title || '',
    body: body || '',
    tag: tag || '',
    pinned: pinned || false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  notes.unshift(note);
  res.status(201).json(note);
});

app.put('/api/notes/:id', (req, res) => {
  const idx = notes.findIndex(n => n.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Note not found' });
  const { title, body, tag, pinned } = req.body;
  notes[idx] = {
    ...notes[idx],
    title: title !== undefined ? title : notes[idx].title,
    body: body !== undefined ? body : notes[idx].body,
    tag: tag !== undefined ? tag : notes[idx].tag,
    pinned: pinned !== undefined ? pinned : notes[idx].pinned,
    updatedAt: new Date().toISOString(),
  };
  res.json(notes[idx]);
});

app.delete('/api/notes/:id', (req, res) => {
  const idx = notes.findIndex(n => n.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Note not found' });
  notes.splice(idx, 1);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});