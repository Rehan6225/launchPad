const express = require('express');
const cors = require('cors');

const missionRoutes = require('./routes/mission.routes');
const { weekRouter, tasksRouter, notesRouter, activityRouter } = require('./routes/week.routes');
const applicationsRoutes = require('./routes/applications.routes');
const authRoutes = require('./routes/auth.routes');
const { requireAuth } = require('./utils/auth');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Everything below the login route requires a valid session.
app.use('/api/auth', authRoutes);
app.use('/api', requireAuth);

app.use('/api/mission', missionRoutes);
app.use('/api/week', weekRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/notes', notesRouter);
app.use('/api/activity', activityRouter);
app.use('/api/applications', applicationsRoutes);

app.use((_req, res) => res.status(404).json({ message: 'Endpoint not found.' }));

// Central error handler — always returns a readable `message` for the UI.
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ message: err.message || 'Unexpected server error.' });
});

module.exports = app;
