const express = require("express");
const app = express();
const bodyParser = require("body-parser");

const cors = require("cors");

const mongoose = require("mongoose");
const shortid = require("shortid");

const dotenv = require('dotenv');

dotenv.config();

const MONGOLAB_URI = process.env.MONGOLAB_URI



mongoose
  .connect(MONGOLAB_URI, { useNewUrlParser: true })
  .then(() => console.log("connection succesfull"))
  .catch(err => console.log('connection failed' + err));
//for FreeCodeCamp tests
app.use(cors());


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
//preventing mongoose deprecation error
mongoose.set("useFindAndModify", false);



const exerciseUserSchema = new mongoose.Schema({
  userId: {
    type: String,
    default: shortid.generate
  },

  name: { type: String },
  //[] by default
  listOfExercises: []

});

const ExerciseUser = mongoose.model("Exercise", exerciseUserSchema);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});
//get all users
app.get("/api/exercise/users", (req, res) => {
  ExerciseUser.find()
    .select("name userId")
    .exec(function(err, users) {
      if (err) return console.error(err);

      res.send(users);
    });
});
//get one specific user
app.get("/api/exercise/:param1", (req, res) => {
  ExerciseUser.findOne({ userId: req.query.userId }, function(err, user) {
    if (err) return console.error(err);

    if (!user) {
      res.send("unknown userId");
    } else {
      let finalListOfExercises = user.listOfExercises.sort(function(a, b) {
        return a.date - b.date;
      });

      if (req.query.from) {
        finalListOfExercises = finalListOfExercises.filter(
          item => item.date >= new Date(req.query.from)
        );
      }

      if (req.query.to) {
        finalListOfExercises = finalListOfExercises.filter(
          item => item.date <= new Date(req.query.to)
        );
      }

      if (req.query.limit) {
        finalListOfExercises = finalListOfExercises.slice(0, req.query.limit);
      }
      //cloning user object, adding count property for user does not work
      let countingObject = Object.assign({}, user);

      countingObject.count = finalListOfExercises.length;
      // displaying more readable date
      let finalListDateToString = [];

      for (el of finalListOfExercises) {
        el.date = el.date.toString().slice(0, 15);
        finalListDateToString.push(el);
      }

      res.send({
        name: user.name,
        userId: user.userId,
        count: countingObject.count,
        listOfExercises: finalListDateToString
      });
    }
  });
});
//adding user
app.post("/api/exercise/new-user", function(req, res, next) {
  ExerciseUser.findOne({ name: req.body.username }, function(err, user) {
    if (err) return console.error(err);
    if (user) {
      res.send("username already taken");
    } else {
      let newUser = req.body.username;

      let newExerciseUser = new ExerciseUser({
        name: newUser
      });

      newExerciseUser.save(function(err) {
        if (err) return console.error(err);
      });

      res.send({
        name: newExerciseUser.name,
        userId: newExerciseUser.userId
      });
    }
  });
});

//adding exercise
app.post("/api/exercise/add", function(req, res) {
  if (req.body.description === "") {
    res.send("description is required");
    return;
  }
  //NaN is falsy
  if (!parseInt(req.body.duration)) {
    res.send("duration has to be a number");
    return;
  }

  if (req.body.date === "") {
    req.body.date = new Date();
  } else {
    req.body.date = new Date(req.body.date);
    //NaN is not equall to NaN
    if (req.body.date.getTime() !== req.body.date.getTime()) {
      res.send("invalid date format");
      return;
    }
  }

  ExerciseUser.findOneAndUpdate(
    {
      userId: req.body.userId
    },
    {
      $push: {
        listOfExercises: {
          description: req.body.description,
          duration: parseInt(req.body.duration),
          date: req.body.date
        }
      }
    }
  ).exec(function(err, user) {
    if (err) return console.error(err);

    if (user) {
      console.log("exercise is added to the list");
      res.send({
        name: user.name,
        userId: req.body.userId,
        description: req.body.description,
        duration: parseInt(req.body.duration),
        //displaying more readable date
        date: req.body.date.toString().slice(0, 15)
      });
      //if no userId found
    } else {
      res.send("unknown userId");
    }
  });
});

app.listen(3000, () => {
  console.log("Node.js listening ...");
});
