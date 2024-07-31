import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import passport from 'passport';
import fs from 'fs';
import https from 'https';
import { Issuer, Strategy } from 'openid-client';

const app = express();

app.use(helmet());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({ secret: 'a very secret secret', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

let client;

(async () => {
  const issuer = await Issuer.discover('http://localhost:3000'); // OIDC provider URL
  client = new issuer.Client({
    client_id: 'foo',
    client_secret: 'bar',
    redirect_uris: ['https://localhost:3001/cb'],
    response_types: ['code'],
  });

  passport.use('oidc', new Strategy({ client, passReqToCallback: true }, (req, tokenSet, userinfo, done) => {
    req.session.tokenSet = tokenSet;
    req.session.userinfo = userinfo;
    return done(null, tokenSet.claims());
  }));

  app.get('/', (req, res) => {
    res.send('OIDC Test Client is running. Go to <a href="/login">/login</a> to start the authentication flow.');
  });

  app.get('/login', passport.authenticate('oidc', { scope: 'openid email profile' }));

  app.get('/login/callback', (req, res, next) => {
    passport.authenticate('oidc', {
      successRedirect: '/user',
      failureRedirect: '/',
    })(req, res, next);
  });

  app.get('/user', (req, res) => {
    res.header('Content-Type', 'application/json');
    res.send(JSON.stringify({ tokenset: req.session.tokenSet, userinfo: req.session.userinfo }, null, 2));
  });

  // Create an HTTPS server
  const privateKey = fs.readFileSync('./localhost.key', 'utf8');
  const certificate = fs.readFileSync('./localhost.crt', 'utf8');
  const credentials = { key: privateKey, cert: certificate };

  const httpsServer = https.createServer(credentials, app);

  httpsServer.listen(3001, () => {
    console.log('RP client listening at https://localhost:3001');
  });
})();
