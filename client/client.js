import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import helmet from 'helmet';
import { Issuer, generators } from 'openid-client';

// Fix for __dirname in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up Express app
const app = express();
const port = 8080;

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(helmet());

app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true,
}));

app.use((req, res, next) => {
  console.log('Session data:', req.session);
  next();
});

// Discover the OIDC provider
Issuer.discover('http://3.22.6.176')  // Using the Elastic IP address
  .then(oidcIssuer => {
    const client = new oidcIssuer.Client({
      client_id: 'oidcCLIENT',
      client_secret: 'client_super_secret',
      redirect_uris: ["http://3.22.6.176:8080/callback"],  // Update callback with Elastic IP
      response_types: ['code'],
    });

    app.get('/auth', (req, res) => {
      const code_verifier = generators.codeVerifier();
      const code_challenge = generators.codeChallenge(code_verifier);

      req.session.code_verifier = code_verifier;

      req.session.save(err => {
        if (err) {
          console.error('Session save error', err);
          res.status(500).send('Error saving session');
          return;
        }

        const url = client.authorizationUrl({
          scope: 'openid email profile',
          code_challenge,
          code_challenge_method: 'S256',
        });

        console.log('Authorization URL:', url);
        res.redirect(url);
      });
    });

    app.get('/callback', async (req, res) => {
      const params = client.callbackParams(req);
      try {
        const tokenSet = await client.callback('http://3.22.6.176:8080/callback', params, { code_verifier: req.session.code_verifier });  // Update callback URL
        console.log('TokenSet:', tokenSet);

        req.session.tokenSet = tokenSet;
        req.session.save(err => {
          if (err) {
            console.error('Session save error', err);
            res.status(500).send('Error saving session');
            return;
          }

          res.redirect('/user');
        });
      } catch (err) {
        console.error('Callback error:', err);
        res.status(500).send('Callback error');
      }
    });

    app.get("/", (req, res) => {
      res.send('OIDC Test Client is running. Go to <a href="/auth">/auth</a> to start the authentication flow.');
    });

    app.get("/user", async (req, res) => {
      console.log("Inside /user route");
      console.log("Session TokenSet:", req.session.tokenSet);

      if (!req.session.tokenSet) {
        res.status(401).send('User not authenticated');
        return;
      }

      try {
        const userinfo = await client.userinfo(req.session.tokenSet.access_token);
        res.header("Content-Type", 'application/json');
        res.end(JSON.stringify({
          tokenset: req.session.tokenSet,
          userinfo: userinfo
        }, null, 2));
      } catch (err) {
        console.error('Userinfo error:', err);
        res.status(500).send('Userinfo error');
      }
    });

    // Start the server
    const httpServer = createServer(app);
    httpServer.listen(port, () => {
      console.log(`RP client listening at http://localhost:${port}`);
    });
  })
  .catch(err => {
    console.error('Issuer discovery failed', err);
  });
