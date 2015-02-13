![authonice logo][logo]

# authonice (nodejs)

## IN PROGRESS: not ready, yet

This is the [authonice](http://authonice.github.io) backend for nodejs, mongoose & express.

[![npm](https://nodei.co/npm/authonice-node.png)](https://www.npmjs.com/package/authonice)
[![Build Status](https://travis-ci.org/authonice/back-node.svg?branch=master)](https://travis-ci.org/authonice/back-node)
[![Code Climate](https://codeclimate.com/github/authonice/back-node/badges/gpa.svg)](https://codeclimate.com/github/authonice/back-node)

[authonice](http://authonice.github.io) is a platform/language/framework agnostic ecosystem for web-app authentication, with lots of inspiration from [satellizer](https://github.com/sahat/satellizer).

It's designed to work with lots of [backend languages](http://authonice.github.io/backends), [auth services](http://authonice.github.io/services), & [frontend frameworks](http://authonice.github.io/frontends). It's goal is to make you super-happy because your sites are safe, easy to setup & maintain, and stylishly locked-down in your language/frameworks of choice.

If we don't have a module for the frontend-framework/backend-language/auth-service you want to support, [ask us](https://github.com/authonice/authonice.github.io/issues/new?title=Request:%20&labels=request) or [contribute](http://authonice.github.io/contribute)!

## installation

```
npm install authonice
```

## usage

```js
var express = require('express');
var app = express();
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/quickstart');
var authonice = require('authonice');
var Email = require('mongoose-type-email');

// Your User model with the default fields
var UserSchema = new mongoose.Schema({
    email: {type: Email, required:true, unique:true},
    password: {type: String, required:true},
    verified: {type:Boolean, default:false}
});
var User = mongoose.model('User', UserSchema);

// mount auth endpoints at /auth
app.use('/auth', authonice.middleware(User));

// lock down your secret API
app.get('/secret', authonice, function(req, res){
  // you have access to req.user here
  res.send('cool!');
});

// serve up whatever your frontend is
app.use(express.static('./public'));

app.listen(3000);
```

### HTTPS

> **PROTIP:** Make sure that you use HTTPS, in production, on your auth endpoints, so users aren't sending their credentials plaintext.

Instead of using `app.listen(3000)` (HTTP) it's highly recommended that you use HTTPS. Here is how you would do that:

```js
var fs = require('fs');
var https = require('https');

var credentials = {
  key: fs.readFileSync('sslcert/server.key', 'utf8'),
  cert: fs.readFileSync('sslcert/server.crt', 'utf8')
};

https.createServer(credentials, app).listen(443);
```

On PAAS like heroku, often you will get put behind a HTTPS proxy, so your users are safe, but it will serve both HTTP & HTTPS. You can help users to use HTTPS on your whole site, by putting this before all other `app` stuff:

```js
app.get('*', function(req,res,next){
  if(req.headers['x-forwarded-proto']!='https'){
    res.redirect('https://mypreferreddomain.com'+req.url);
  }else{
    next();
  } 
});
```

### endpoints

If you mounted your endpoint at `/auth` (above) you will get these REST endpoints:

- `POST /auth/login` - login with `email` & `password`, receive an auth token
- `POST /auth/register` - register a new user, send verification email
- `GET /auth/verify/:code` - verify a user, based on an email they received
- `GET /auth/resend` - resend verification email (requires `email` in POST vars)
- `GET /auth/user` (LOCKED) - send user object
- `GET /auth/token` (LOCKED) - fast token-check, sends `OK`

All the [frontends](http://authonice.github.io/frontends) should support these, once you tell them the endpoint (in the above examples, `/auth`)

### next steps

- Go get a [frontend module](http://authonice.github.io/frontends) to give your app a face.
- Add some [services](http://authonice.github.io/services) so you can accept logins authentication from social networks and things.


[logo]: http://authonice.github.io/logo.png