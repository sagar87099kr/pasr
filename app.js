
const compression = require("compression");
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
const localMarketRouter = require("./routes/localMarket.js");
const kisanSabhaRouter = require("./routes/kisanSabha.js");

// const dbUrl = "mongodb://127.0.0.1:27017/pasr";
const dbUrl = process.env.ATLAS_DB_URL;
if (!dbUrl) {
  throw new Error("ATLAS_DB is missing in your .env file");
}

const clientPromise = mongoose.connect(dbUrl)
  .then(() => {
    console.log("connected to databases");
    return mongoose.connection.getClient();
  })
  .catch((err) => {
    console.log(err);
  });

const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
// const xss = require("xss-clean"); // Sanitization
const rateLimit = require("express-rate-limit");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
// Compression middleware — gzip/brotli all responses (biggest TTFB win)
app.use(compression());

// Serve assetlinks.json explicitly since express.static ignores dotfiles by default
app.get("/.well-known/assetlinks.json", (req, res) => {
  res.sendFile(path.join(__dirname, "public", ".well-known", "assetlinks.json"));
});

// Serve static files with long cache headers (1 year for assets)
app.use(express.static(path.join(__dirname, "public"), {
  maxAge: '1y',
  etag: true,
  lastModified: true,
}))
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.json());

// Trust proxy for secure cookies behind reverse proxies (Render, Heroku, etc.)
app.set("trust proxy", 1);

// Security Middleware
app.use(helmet({ contentSecurityPolicy: false })); // CSP is complex, disabling for now to avoid breaking maps/images
// mongoSanitize is DISABLED — incompatible with Express 5 (req.query is a read-only getter)
// app.use(mongoSanitize({ replaceWith: '_' }));
// app.use(xss()); // DEPRECATED & CAUSES ERROR: Cannot set property query of #<IncomingMessage> which has only a getter


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased to 1000 to prevent blocking owner/users during normal use
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

const store = MongoStore.create({
  clientPromise,
  crypto: {
    secret: process.env.SECRET, // encrypt session in DB
  },
  touchAfter: 7 * 24 * 3600, // reduce DB writes
});

store.on("error", (err) => {
  console.log("SESSION STORE ERROR:", err);
});

const sessionConfig = {
  store,
  name: "pasr.sid",
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
  },
};

// Only enable secure cookies if in production environment to avoid breaking localhost
if (process.env.NODE_ENV === "production" || app.get("env") === "production") {
  sessionConfig.cookie.secure = true;
}

app.use(session(sessionConfig));

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

  // Default SEO Tags
  res.locals.seo = {
    title: "PASR - Kisan Sabha & Local Bazaar",
    description: "Connect with local farmers and shops on PASR. Find fresh produce, farm tools, and daily services in your neighborhood.",
    keywords: "pasr, pasr.in, pasr market, pasr online, pasr giridih, pasr jharkhand, pasr farmers, pasr digital market, pasr website, pasr app, past in, past.in, p p market, pp market jharkhand, online market giridih, digital market giridih, 24 hours market giridih, farmers website giridih, kisan website jharkhand, online sabzi market giridih, buy vegetables online giridih, sell crops online giridih, giridih online shop, raj dhanwar online market, doranda online market, jharkhand farmers app, local business listing giridih, online dairy products giridih, sell milk online jharkhand, online goat selling giridih, poultry market online jharkhand, kisan news giridih, farmers news jharkhand, online agriculture platform india, district farmers network giridih, giridih business promotion website, digital kranti giridih, kisan digital platform, online mandi giridih, giridih bazar online, raj dhanwar bazar online, doranda bazar online, jharkhand digital bazar, local sellers website giridih, online services giridih, electrician online giridih, plumber online giridih, local mechanic giridih, property listing giridih, house rent giridih online, land sale giridih website, giridih job posting site, giridih advertisement website, free business listing giridih, small business promotion jharkhand, rural ecommerce india, village digital market jharkhand, kisan connect giridih, online fertilizer shop giridih, tractor service giridih, agriculture tools online giridih, farm equipment giridih, pasr news section, pasr farmer community, pasr online mandi, pasr jharkhand market, pasr digital india, pasr local platform, pasr rajdhanwar, pasr doranda, pasr kisan app, pasr business portal, pasr advertisement site, pasr farmers network, pasr online bazar, pasr district market, pasr agriculture news, pasr buy sell platform, pasr marketplace, pasr india, pasr rural market, pasr farmer support, pasr online promotion, pasr india website, pasr farmer group, pasr online service listing, pasr local business site, pasr digital shop, pasr ecommerce jharkhand, pasr giridih district, pasr rural ecommerce, pasr krishi platform, pasr mandi online, pasr digital business, pasr 24 hours market, pasr online store, pasr jharkhand farmers, pasr digital advertisement, pasr kisan news portal, pasr village market, pasr business growth platform, pasr community market",
    image: "https://www.pasr.in/images/icon.jpeg",
    url: "https://www.pasr.in" + req.originalUrl,
  };

  next();
});



// Use Routers
app.use("/", indexRouter);

app.use("/", userRouter);
app.use("/", providerRouter);
app.use("/", reviewRouter);
app.use("/", scheduleRouter);
app.use("/", localMarketRouter);
app.use("/", kisanSabhaRouter);
app.use("/", require("./routes/shops.js"));


app.use((req, res, next) => {
  next(new ExpressError(404, "Page not found!"));
});
app.use((err, req, res, next) => {
  let { statusCode = Number(err.statusCode) || 500, message = "Something Went wrong!" } = err;
  res.status(statusCode).render("pages/error.ejs", { message });

});
app.listen(process.env.PORT || 8080, (req, res) => {
  console.log("listening to port 8080");
});
