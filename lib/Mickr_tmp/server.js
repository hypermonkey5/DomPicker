const path = require('path');
const http = require('http');
const express = require('express');

const app = express();
app.use(express.static(path.join(__dirname, '/public')));

const server = http.createServer(app);
server.listen(7000);
