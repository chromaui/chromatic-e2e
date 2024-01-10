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

// Asset path pages
app.get('/asset-paths/:page', (req, res) => {
  res.sendFile(path.join(__dirname, `fixtures/asset-paths/${req.params.page}.html`));
});

app.get('/ignore', (req, res) => {
  res.sendFile(path.join(__dirname, 'fixtures/dynamic-content.html'));
});

app.get('/forms', (req, res) => {
  res.sendFile(path.join(__dirname, 'fixtures/forms.html'));
});

// Send a redirect to the GET handler with the same path to ensure we're not caching POST responses and serving
// it instead of the real GET response.
app.post('/form-success', (req, res) => {
  res.send(
    `${htmlIntro}<head><meta http-equiv="refresh" content="0; URL=/form-success" /></head><body></body>${htmlOutro}`
  );
});

app.get('/form-success', (req, res) => {
  res.send(`${htmlIntro}<body><p>OK!</p></body>${htmlOutro}`);
});

// Assets

app.get('/css.urls.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'fixtures/css.urls.css'));
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

app.get('/img/another%Cwith%Cpercents', (req, res) => {
  res.sendFile(path.join(__dirname, 'fixtures/pink.png'));
});

app.get('/asset-paths/relative/purple.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'fixtures/purple.png'));
});

app.get('/background-img.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'fixtures/purple.png'));
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
