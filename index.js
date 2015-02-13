var express = require('express');
var mongoose = require('mongoose');
var JWT = require('jwt-async');
var bodyParser = require('body-parser');
var urlParse = bodyParser.urlencoded({ extended: true });
var jsonParse = bodyParser.json();

// create a random string
function generateCode(){
  return Math.random().toString(36).slice(-8);
}

var VerifySchema = new mongoose.Schema({
  user: Object,
  code: {
    type: String,
    default: generateCode
  }
});
var Verify = mongoose.model('AuthoniceVerify', VerifySchema);

// wrapper for simple errors
function sendError(res, status) {
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
}

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
    return sendError(res, 401)('Token not set.');
  }
  jwt.verify(token, function(err, data) {
    if (err) {
      return sendError(res, 401)(err);
    }
    req.user = data.claims.user;
    delete req.user.password;
    next();
  });
};

// middleware for auth endpopints
authonice.setup = function(User, options) {
  options = options || {};
  
  options.verifyCallback = options.verifyCallback || function(user, code) {
    console.log('/verify/' + code);
  };
  
  var auth = express();

  jwt = new JWT({
    crypto: {
      algorithm: 'HS512',
      secret: options.secret || generateCode() + generateCode() + generateCode()
    }
  });
  
  // get JWT token for login credentials
  auth.post('/login', [urlParse, jsonParse], function(req, res) {
    User.findOne({
      email: req.body.email
    }).exec().then(function(user) {
      if (user) {
        if (!user.verified) {
          return sendError(res, 401)('User not verified.');
        }
        user.verifyPassword(req.body.password, function(err, isMatch) {
          if (err) {
            return sendError(res)('Database error looking up user.');
          }
          if (!isMatch) {
            return sendError(res, 401)('Bad password.');
          }
          delete user.password;
          jwt.sign({
            user: user
          }, function(err, token) {
            if (err) {
              return sendError(res)(err);
            }
            return res.send({
              token: token
            });
          });
        });
      } else {
        return sendError(res, 401)('User not found.');
      }
    }, sendError(res));
  });
  
  // register new login credentials
  auth.post('/register', [urlParse, jsonParse], function(req, res) {
    var user = new User({
      email: req.body.email,
      password: req.body.password
    });
    user.save(function(err, u) {
      if (err) {
        return sendError(res)('Database error saving user.');
      }
      var verify = new Verify({
        user: user
      });
      verify.save();
      options.verifyCallback(u, verify.code);
      return res.send({
        'message': 'OK'
      });
    });
  });
  
  // verify a user
  auth.post('/verify', [urlParse, jsonParse], function(req, res) {
    Verify.findOne({
      code: req.body.token
    }).exec().then(function(verify) {
      if (!verify) {
        return sendError(res)('Code not found.');
      }
      User.findOneAndUpdate({
        _id: verify.user
      }, {
        verified: true
      }).exec().then(function() {
        verify.remove();
        return res.send({
          'message': 'OK'
        });
      }, sendError(res));
    }, sendError(res));
  });
  
  // get user info
  auth.get('/user', authonice, function(req, res) {
    res.send(req.user);
  });
  
  // quick token check
  auth.get('/user', authonice, function(req, res) {
    res.send({
      'message': 'OK'
    });
  });
  
  // request a verify-reissue
  auth.post('/resend', [urlParse, jsonParse], function(req, res) {
    sendError(res)('TODO');
  });
  
  return auth;
};