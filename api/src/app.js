const express = require('express');
const cors = require('cors');

const missionRoutes = require('./routes/mission.routes');
const { router: weeksRoutes } = require('./routes/weeks.routes');
const { tasksRouter, outcomesRouter } = require('./routes/tasks.routes');
const logsRoutes = require('./routes/logs.routes');
const { router: applicationsRoutes, roundsRouter } = require('./routes/applications.routes');
const insightsRoutes = require('./routes/insights.routes');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/mission', missionRoutes);
app.use('/api/weeks', weeksRoutes);
app.use('/api/tasks', tasksRouter);
app.use('/api/outcomes', outcomesRouter);
app.use('/api/logs', logsRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/rounds', roundsRouter);
app.use('/api/insights', insightsRoutes);

app.use((_req, res) => res.status(404).json({ message: 'Endpoint not found.' }));

// Central error handler — always returns a readable `message` for the UI.
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ message: err.message || 'Unexpected server error.' });
});

module.exports = app;
