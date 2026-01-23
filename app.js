
const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const Customer = require("./data/customers.js");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const ExpressError = require("./utils/expressError.js");
require('dotenv').config();

// Routers
const userRouter = require("./routes/user.js");
const providerRouter = require("./routes/provider.js");
const reviewRouter = require("./routes/review.js");
const scheduleRouter = require("./routes/schedule.js");
const indexRouter = require("./routes/index.js");

const dbUrl = process.env.ATLAS_DB_URL;
if (!dbUrl) {
  throw new Error("ATLAS_DB is missing in your .env file");
}

main()
  .then(() => {
    console.log("connected to databases");
  }).catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(dbUrl)
};

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")))
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.json());
const store = MongoStore.create({
  mongoUrl: dbUrl,
  crypto: {
    secret: process.env.SECRET, // encrypt session in DB
  },
  touchAfter: 7 * 24 * 3600, // reduce DB writes
});
store.on("error", (err) => {
  console.log("SESSION STORE ERROR:", err);
});
app.use(
  session({
    store,
    name: "pasr.sid",
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
    },
  })
);

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
// step 1
passport.use(new LocalStrategy(Customer.authenticate()));

// step 2
passport.serializeUser(Customer.serializeUser());

// step 3
passport.deserializeUser(Customer.deserializeUser());

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.danger = req.flash("danger");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  res.locals.mapToken = process.env.MAP_TOKEN;
  next();
});

// Use Routers
app.use("/", indexRouter);
app.use("/", userRouter);
app.use("/", providerRouter);
app.use("/", reviewRouter);
app.use("/", scheduleRouter);


app.use((req, res, next) => {
  next(new ExpressError(404, "Page not found!"));
});
app.use((err, req, res, next) => {
  let { statusCode = Number(err.statusCode) || 500, message = "Something Went wrong!" } = err;
  res.status(statusCode).render("pages/error.ejs", { message });

});
app.listen(8080, (req, res) => {
  console.log("listening to port 8080");
});
