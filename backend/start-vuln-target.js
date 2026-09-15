const express = require('express');
const app = express();
const PORT = 4000;

// Serve a fake .env file
app.get('/.env', (req, res) => {
  res.send(`
DATABASE_URL=postgres://admin:password123@localhost:5432/mydb
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
  `);
});

// Serve a fake script bundle with a leaked key
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Vulnerable App</title></head>
      <body>
        <h1>Welcome to my app</h1>
        <script src="/main.js"></script>
      </body>
    </html>
  `);
});

app.get('/main.js', (req, res) => {
  res.send(`
    const config = {
      firebaseToken: "AIzaSyC_test_fake_token_for_traceguard_scan",
      githubToken: "ghp_abcdefghijklmnopqrstuvwxyz1234567890"
    };
    console.log("App loaded");
  `);
});

app.listen(PORT, () => {
  console.log(`[VulnTarget] Vulnerable test server running on http://localhost:${PORT}`);
  console.log(`[VulnTarget] It is intentionally exposing /.env and secrets in main.js`);
});
