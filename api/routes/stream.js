const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no'
  });

  res.write(': connected\n\n');
  req.app.locals.clients.add(res);

  req.on('close', () => {
    req.app.locals.clients.delete(res);
  });
});

module.exports = router;
