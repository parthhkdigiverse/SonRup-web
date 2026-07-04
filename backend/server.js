const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Fallback route to serve index.html for any other requests (useful for SPA behavior if needed, or index default)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
