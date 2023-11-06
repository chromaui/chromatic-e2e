const path = require('path');
// eslint-disable-next-line import/no-extraneous-dependencies
const express = require('express');

const app = express();
const port = 3000;

const htmlIntro = `<!doctype html><html>`;
const htmlOutro = `</html>`;

// Pages

app.get('/', (req, res) => {
  res.send(`${htmlIntro}<body>Testing</body>${htmlOutro}`);
});

app.get('/asset-paths', (req, res) => {
  res.sendFile(path.join(__dirname, 'fixtures/asset-paths.html'));
});

// Assets

app.get('/styles.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'fixtures/styles.css'));
});

app.get(
  '/blahblahblahblahblahblahblahblahblahblahbblahblahblahblahblahblahblahblahblahblahbblahblahblahblahblahblahblahblahblahblahbblahblahblahblahblahblahblahblahblahblahbblahblahblahblahblahblahblahblahblahblahbblahblahblahblahblahblahblahblahblahblahbblahblahblahblahblahblahblahblahblahblahbblahblahblahblahblahblahblahblahblahblahbblahblahblahblahblahblahblahblahblahblahbblahblahblahblahblahblahblahblahblahblahbblahblahblahblahblahblahblahblahblahblahbblahblahblahblahblahblahblahblahblahblahbblahblahblahblahblahblahblahblahblahblahbblahblahblahblahblahblahblahblahblahblahbblahblahblahblahblahblahblahblahblahblahbblahblahblahblahblahblahblahblahblahblahbblahblahblahblahblahblahblahblahblahblahbblahblahblahblahblahblahblahblahblahblahbblahblahblahblahblahblahblahblahblahblahbblahblahblahblahblahblahblahblahblahblahbblahblahblahblahblahblahblahblahblahblahbblahblahblahblahblahblahblahblahblahblahbblahblahblahblahblahblahblahblahblahblahbblahblahblahblahblahblahblahblahblahblahbblahblahblahblahblahblahblahblahblahblahbblahblahblahblahblahblahblahblahblahblahbblahblahblahblahblahblahblahblahblahblahbblahblahblahblahblahblahblahblahblahblahbblahblahblahblahblahblahblahblahblahblahb',
  (req, res) => {
    res.sendFile(path.join(__dirname, 'fixtures/blue.png'));
  }
);

app.get('/img', (req, res) => {
  if (req.query.url) {
    res.sendFile(path.join(__dirname, req.query.url));
  } else {
    res.sendFile(path.join(__dirname, 'fixtures/blue.png'));
  }
});

app.get('/img/another', (req, res) => {
  res.sendFile(path.join(__dirname, 'fixtures/pink.png'));
});

app.get('/background-img.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'fixtures/purple.png'));
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
