const path = require('path');
const express = require('express');
const basicAuth = require('express-basic-auth');

const htmlIntro = `<!doctype html><html>`;
const htmlOutro = `</html>`;
const rootPageHtml = `${htmlIntro}<body>Testing testing just a basic page</body>${htmlOutro}`;

const app = express();

// Minimal second origin for cross-origin iframe embed tests (same document as `/` on this app).
const embedApp = express();
embedApp.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, `fixtures/embeds/embedded-page.html`));
});
embedApp.get('/img', (req, res) => {
  res.sendFile(path.join(__dirname, req.query.url));
});

const port = 3000;
const embedPort = 3001;

app.use(
  '/protected',
  basicAuth({
    users: { user: 'secret' },
    challenge: true,
  })
);

app.use(
  '/admin',
  basicAuth({
    users: { admin: 'supersecret' },
    challenge: true,
  })
);

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

app.get('/protected', (req, res) => {
  res.sendFile(path.join(__dirname, 'fixtures/auth/index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'fixtures/auth/index.html'));
});

app.get('/img/another', (req, res) => {
  res.sendFile(path.join(__dirname, 'fixtures/pink.png'));
});

app.get('/img/another/no-content-type', (req, res) => {
  res.setHeader('content-type', 'fake/content'); // Simulate no matching file extension from mime lib
  res.sendFile(path.join(__dirname, 'fixtures/purple.png'));
});

app.get('/img/another/no-content-type/first', (req, res) => {
  res.setHeader('content-type', 'fake/content'); // Simulate no matching file extension from mime lib
  res.sendFile(path.join(__dirname, 'fixtures/blue.png'));
});

app.get('/img/another%Cwith%Cpercents', (req, res) => {
  res.sendFile(path.join(__dirname, 'fixtures/pink.png'));
});

app.get('/asset-paths/@fz/C:/img/another:Cwith:colons/image.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'fixtures/blue.png'));
});

app.get('/@fz/C:/img/another:Cwith:colons/image.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'fixtures/blue.png'));
});

app.get('/asset-paths/relative/purple.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'fixtures/purple.png'));
});

app.get('/background-img.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'fixtures/purple.png'));
});

app.use(express.static(path.join(__dirname, 'fixtures/assets')));

// Pages
app.get('/', (req, res) => {
  res.send(rootPageHtml);
});

// Asset path pages
app.get('/asset-paths/:page', (req, res) => {
  res.sendFile(path.join(__dirname, `fixtures/asset-paths/${req.params.page}.html`));
});

// Options pages
app.get('/options/:page', (req, res) => {
  res.sendFile(path.join(__dirname, `fixtures/options/${req.params.page}.html`));
});

app.get('/ignore', (req, res) => {
  res.sendFile(path.join(__dirname, 'fixtures/dynamic-content.html'));
});

app.get('/forms', (req, res) => {
  res.sendFile(path.join(__dirname, 'fixtures/forms.html'));
});

app.get('/no-doctype', (req, res) => {
  res.sendFile(path.join(__dirname, 'fixtures/no-doctype.html'));
});

app.get('/viewports', (req, res) => {
  res.sendFile(path.join(__dirname, 'fixtures/viewports.html'));
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

app.get('/manual-snapshots', (req, res) => {
  res.sendFile(path.join(__dirname, 'fixtures/manual-snapshots.html'));
});

app.get('/css-pseudo-states', (req, res) => {
  res.sendFile(path.join(__dirname, 'fixtures/css-pseudo-states.html'));
});

app.get('/constructable-stylesheets/:page', (req, res) => {
  const page = req.params.page.replace(/[^a-zA-Z0-9-]/g, '');
  res.sendFile(path.join(__dirname, `fixtures/constructable-stylesheets/${page}.html`));
});

app.get('/embeds/:page', (req, res) => {
  res.sendFile(path.join(__dirname, `fixtures/embeds/${req.params.page}.html`));
});

app.get('/amd', (req, res) => {
  res.sendFile(path.join(__dirname, 'fixtures/amd.html'));
});

app.get('/createObjectUrl', (req, res) => {
  res.sendFile(path.join(__dirname, 'fixtures/createObjectUrl.html'));
});

app.get('/canvas', (req, res) => {
  res.sendFile(path.join(__dirname, 'fixtures/canvas.html'));
});

const server = app.listen(port, () => {
  console.log(`Example app port http://localhost:${port}`);
});

const embedServer = embedApp.listen(embedPort, () => {
  console.log(`Embed origin port http://localhost:${embedPort}`);
});

module.exports = { server, embedServer };
