import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { Issuer, Strategy } from 'openid-client';
import passport from 'passport';
import helmet from 'helmet';

// Convert `import.meta.url` to a directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cookieParser());
app.use(express.urlencoded({
   extended: true,
}));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
     secret: 'secret',                  
     resave: false,                  
     saveUninitialized: true,
}));
app.use(helmet());
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
    console.log('-----------------------------');
    console.log('serialize user');
    console.log(user);
    console.log('-----------------------------');
    done(null, user);
});

passport.deserializeUser((user, done) => {
    console.log('-----------------------------');
    console.log('deserialize user');
    console.log(user);
    console.log('-----------------------------');
    done(null, user);
});

const issuer = await Issuer.discover('http://localhost:3000'); // OIDC provider URL
const client = new issuer.Client({
    client_id: 'oidcCLIENT',
    client_secret: 'client_super_secret',
    redirect_uris: ['http://localhost:8080/login/callback'],
    response_types: ['code'],
});

passport.use('oidc', new Strategy({ client, passReqToCallback: true }, (req, tokenSet, userinfo, done) => {
    console.log("tokenSet", tokenSet);
    console.log("userinfo", userinfo);
    req.session.tokenSet = tokenSet;
    req.session.userinfo = userinfo;
    req.session.save((err) => {
        if (err) {
            console.log('Error saving session:', err);
            return done(err);
        }
        console.log('Session saved successfully');
        return done(null, tokenSet.claims());
    });
}));

app.get('/login',
(req, res, next) => {
    console.log('-----------------------------');
    console.log('Login Handler Started');
    next();
},
passport.authenticate('oidc', { scope: "openid" }));

app.get('/login/callback', (req, res, next) => {
    passport.authenticate('oidc', (err, user, info) => {
      if (err) {
        console.error('Error during authentication:', err);
        return next(err);
      }
      if (!user) {
        console.log('No user received.');
        return res.redirect('/');
      }
      req.logIn(user, (err) => {
        if (err) {
          console.error('Error during login:', err);
          return next(err);
        }
        return res.redirect('/user');
      });
    })(req, res, next);
});

app.get("/", (req, res) => {
   res.send(" <a href='/login'>Log In with OAuth 2.0 Provider </a>");
});

app.get("/user", (req, res) => {
    console.log('Session TokenSet:', req.session.tokenSet);
    console.log('Session UserInfo:', req.session.userinfo);
    res.header("Content-Type", 'application/json');   
    res.end(JSON.stringify({ tokenset: req.session.tokenSet, userinfo: req.session.userinfo }, null, 2));
});

const httpServer = http.createServer(app);
httpServer.listen(8080, () => {
    console.log(`Http Server Running on port 8080`);
});
