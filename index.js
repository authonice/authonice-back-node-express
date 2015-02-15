var express = require('express');
var mongoose = require('mongoose');
var JWT = require('jwt-async');
var bodyParser = require('body-parser');
var urlParse = bodyParser.urlencoded({ extended: true });
var jsonParse = bodyParser.json();

var jwt;

// require auth
var authonice = module.exports = function(req, res, next) {
  if (!jwt) {
    throw new Error("You must setup the express middleware first.");
  }
  var token;
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    token = req.headers.authorization.split(' ')[1];
  }
  if (req.body && req.body.token) {
    token = req.body.token;
  }
  if (!token) {
    return authonice.sendError(res, 401)('Token not set.');
  }
  jwt.verify(token, function(err, data) {
    if (err) {
      return authonice.sendError(res, 401)(err);
    }
    req.user = data.claims.user;
    delete req.user.password;
    next();
  });
};

// middleware for auth endpopints
authonice.middleware = function(User, options) {
  options = options || {};
  
  options.verifyCallback = options.verifyCallback || function(user) {
    console.log('/verify/' + user.verify);
  };
  
  var auth = express();

  jwt = new JWT({
    crypto: {
      algorithm: 'HS512',
      secret: options.secret || authonice.generateCode() + authonice.generateCode() + authonice.generateCode()
    }
  });
  
  // get JWT token for login credentials
  auth.post('/login', [urlParse, jsonParse], function(req, res) {
    User.findOne({
      email: req.body.email
    }).exec().then(function(user) {
      if (user) {
        if (user.verify !== 'yes') {
          return authonice.sendError(res, 401)('User not verified.');
        }
        user.verifyPassword(req.body.password, function(err, isMatch) {
          if (err) {
            return authonice.sendError(res)('Database error looking up user.');
          }
          if (!isMatch) {
            return authonice.sendError(res, 401)('Bad password.');
          }
          delete user.password;
          jwt.sign({
            user: user
          }, function(err, token) {
            if (err) {
              return authonice.sendError(res)(err);
            }
            return res.send('"' + token + '"');
          });
        });
      } else {
        return authonice.sendError(res, 401)('User not found.');
      }
    }, authonice.sendError(res));
  });
  
  // register new login credentials
  auth.post('/register', [urlParse, jsonParse], function(req, res) {
    var user = new User({
      email: req.body.email,
      password: req.body.password,
      verify: authonice.generateCode()
    });
    user.save(function(err, u) {
      if (err) {
        if (err.code == 11000){
          err.type == 'emailDupe';
        }
        return authonice.sendError(res)(err);
      }
      options.verifyCallback(u);
      return res.send('"OK"');
    });
  });
  
  // verify a user
  auth.post('/verify', [urlParse, jsonParse], function(req, res) {
    User.findOne({
      verify: req.body.token
    }).exec().then(function(user) {
      if (!user) {
        return authonice.sendError(res)('Code not found.');
      }
      user.verify = 'yes';
      user.save(function(err, u, numberAffected){
        if (err) return authonice.sendError(res, 500)("Couldn't save.");
        return res.send('"OK"');
      });
    }, authonice.sendError(res));
  });
  
  // get user info
  auth.get('/user', authonice, function(req, res) {
    res.send(req.user);
  });
  
  // quick token check
  auth.get('/token', authonice, function(req, res) {
    res.send('"OK"');
  });
  
  // request a verify-reissue
  auth.post('/resend', [urlParse, jsonParse], function(req, res) {
    authonice.sendError(res)('"TODO"');
  });
  
  return auth;
};

// wrapper for simple errors
authonice.sendError = function(res, status) {
  status = status || 500;
  return function(err) {
    if (typeof err === 'string') {
      err = {
        message: err
      };
    }
    err.status = status;
    return res.status(status).send(err);
  };
};

// create a random string
authonice.generateCode = function(){
  return Math.random().toString(36).slice(-8);
};