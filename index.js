const express = require('express');
const path = require('path');

const app = express();
const PORT = 9061;

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Send main HTML file for any route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
