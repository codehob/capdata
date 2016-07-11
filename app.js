process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var routes = require('./routes/index');
var users = require('./routes/users');
var Firebase = require("firebase");
var fs = require('fs');
var http = require('http');
var moment = require('moment');
var twitter = require('twitter-text');
var mentions = require('mentions');
var Twit = require('twit');
var config = require('./config');
var stockTwits = require('stocktwits');
var curl = require('curlrequest');
var restClient = require('node-rest-client').Client;
var restclient = new restClient();


var app = express();
var Last_Search_since_id = 0;
var Last_Profile_since_id;
var twitterConnection = new Twit({
  consumer_key: config.consumer_key,
  consumer_secret: config.consumer_secret,
  access_token: config.access_token,
  access_token_secret: config.access_token_secret
});

app.set('port', process.env.PORT || 8082);
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// view engine setup
//app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;
var capdataFirebaseRef = new Firebase("https://capdata.firebaseio.com/");
var token ='Usj4vkbHbJL9ohaUCCgc4uZMeHPBC8X9vv07uzcQ';

//searchTweets();

function searchTwitter(){

  try {
    //1. twitter data
    var stream = twitterConnection.stream('statuses/filter', {track: 'aapl'});

    stream.on('tweet', function (tweet) {
      var location = '/Twitter/' + tweet.id;
      //console.log(tweet);
      var tweetString = JSON.stringify(tweet);
      var tweetObject = JSON.parse(tweetString);
      capdataFirebaseRef.root().child(location).set(
          tweetObject
      );
      //console.log('Tweet Data------------------------' + JSON.stringify(tweet));
    });

    stream.on('warning', function (warning) {
      console.log(warning);
    });

    stream.on('error', function (error) {
      console.log(error);
    });
  }
  catch(exception){
    console.log(exception);
  }

}
function searchStockTwits() {
  try {


    //2.stock tweets data
    var args = {
      data: { client_id: "654b05ab8541b9fa",response_type:'Code',scope:'read',redirect_uri:'http://www.google.com',prompt:0 },
      headers: { "Content-Type": "application/json" }
    };

    restclient.get("https://api.stocktwits.com/api/2/streams/symbol/AAPL.json?access_token=36e886819f5c4abe72e667096a417b9f2b3b4afe", function (data, response) {


      var stockTwitsString = JSON.stringify(data);
      var stockTwitsJsonObject = JSON.parse(stockTwitsString);
      var stockTwitsArray = stockTwitsJsonObject.messages;
      stockTwitsArray.forEach(function(element){
        var stockTwitslocation = '/StockTwits/'+element.id;
        capdataFirebaseRef.root().child(stockTwitslocation).set
        (
            element
        );
      });

    });


    restclient.on('requestTimeout', function (req) {
      console.log('request has expired');
      restclient.abort();
    });

    restclient.on('responseTimeout', function (res) {
      console.log('response has expired');

    });

//it's usefull to handle request errors to avoid, for example, socket hang up errors on request timeouts
    restclient.on('error', function (err) {
      console.log('request error', err);
    });
  }
  catch
      (error) {
    console.log('Error searchTweets:         ' + error);
  }
}

var router = express.Router();


capdataFirebaseRef.authWithCustomToken(token, function (error, authData) {

  if (error) {
    console.log("Login Failed!", error);
  } else {

    capdataFirebaseRef.child("TwitterFeed").once("value", function (snapshot) {
    }, function (errorObject) {
      console.log("The read failed: " + errorObject.code);
    });
    console.log("Firebase Login Succeeded");

    //capdataFirebaseRef.remove();
    searchTwitter();
    searchStockTwits();
    setInterval(searchStockTwits, 10000);
  }
});

router.use(function (req, res, next) {
  next();
});

router.get("/", function (req, res) {
  res.sendFile(path + "index.html");
});

router.get("/about", function (req, res) {
  res.send('{"draw": 1,"recordsTotal": 37,"recordsFiltered": 27,"data": [["Airi","Satou","Accountant","Tokyo","28th Nov 08","$162,700"]]}');
  //res.sendFile(path + "about.html");
});

router.get("/contact", function (req, res) {
  res.sendFile(path + "contact.html");
});

// Start the server.
http.createServer(app).listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});

//    "start":"node app.js"