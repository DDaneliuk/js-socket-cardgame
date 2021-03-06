const bcrypt = require("bcrypt");
const User = require("../models/user");

exports.signup = (req, res) => {
  const { email, login, password, confirmpass } = req.body;
  User.getUser(email, function (err, result) {
    if (err) {
      console.log(err);
    }
    if (result && result.length > 0) {
      return res.render("signup", {
        message: "That email is already in use",
      });
    } else if (password !== confirmpass) {
      return res.render("signup", {
        message: "Wrong confirm pass. Try again",
      });
    }
    User.insertUser(email, login, password, function (err, result) {
      if (err) {
        console.log(err);
      } else {
        return res.render("signup", {
          successmessage: `Congrats ${login}, you have successfully signed up!`,
          signup: true,
        });
      }
    });
  });
};

exports.login = (req, res) => {
  const { email, password } = req.body;
  if (email && password) {
    User.getUser(email, async function (err, result) {
      if (err) console.log(err);

      if ( !result || !result[0] ) {
        return res.render("login", {
          message: `Sorry, your password or email is incorrect. Please try again`,
        });
      } else {
        const passCorrect = await bcrypt.compare(password, result[0].password)
        if(!passCorrect) {
          return res.render("login", {
            message: `Sorry, your password or email is incorrect. Please try again`,
          });
        }
        
        res.cookie('userName', result[0].login);
        res.cookie('email', result[0].email);
        return res.redirect("gamepage");
      }
    });
  } else {
    return res.render("login", {
      message: "Fill all fields",
    });
  }
};
