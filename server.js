var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");

var Note = require("./models/Note.js");
var Article = require("./models/Article.js");

var request = require("request");
var cheerio = require("cheerio");
var exphbs = require("express-handlebars");
var path = require("path");
var router = express.Router();
var controller = require("./controller");
mongoose.Promise = Promise;

var app = express();

app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');
app.set("views", path.join(__dirname, "/views"));

app.use(express.static(process.cwd() + "/public"));

app.use(logger("dev"));
app.use(bodyParser.urlencoded({
  extended: false
}));

mongoose.connect("mongodb://localhost/MongolianAssignment");
var db = mongoose.connection;

db.on("error", function(error) {
  console.log("Mongoose Error: ", error);
});

db.once("open", function() {
  console.log("Mongoose connection successful.");
});

app.use("/", controller);

app.get("/scrape", function(req, res) {
  Article.find({}, function(error, docs) {
    request("https://www.reddit.com/r/buildapcsales", function(error, response, html) {
      var $ = cheerio.load(html);
      $("p.title").each(function(i, element) {

        var result = {};

        result.title = $(this).text();
        result.link = $(this).children().attr("href");

        var checkDupe = false;

        for(var i = 0; i < docs.length; i++) {
          if(docs[i].title === result.title) {
            checkDupe = true;
          }
        }

        if(checkDupe) {
          console.log("Nope.gif");
        } else {
          var entry = new Article(result);

          entry.save(function(err, doc) {
            if (err) {
              console.log(err);
            }
            else {
              console.log(doc);
            }
          });          
        }
      });
      res.redirect("/");
    });    
  })

});

app.get("/articles", function(req, res) {
  Article.find({}, function(error, doc) {
    if (error) {
      console.log(error);
    }
    else {
      res.json(doc);
    }
  });
});

app.get("/articles/:id", function(req, res) {
  Article.findOne({ "_id": req.params.id })
  .populate("note")
  .exec(function(error, doc) {
    if (error) {
      console.log(error);
    }
    else {
      res.json(doc);
    }
  });
});

app.post("/articles/:id", function(req, res) {
  var newNote = new Note(req.body);

  newNote.save(function(error, doc) {
    if (error) {
      console.log(error);
    }
    else {
      Article.findOneAndUpdate({ "_id": req.params.id }, { "note": doc._id })
      .exec(function(err, doc) {
        if (err) {
          console.log(err);
        }
        else {
          res.send(doc);
        }
      });
    }
  });
});


// Listen on port 3000
app.listen(process.env.PORT || 3000, function() {
  console.log("App running on port 3000!");
});
