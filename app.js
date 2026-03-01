
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
    console.error("DATABASE CONNECTION ERROR:", err.message);
    console.error("Check your ATLAS_DB_URL and IP whitelist settings.");
    throw err; // Re-throw to prevent "undefined" being passed to MongoStore
  });

const cookieParser = require("cookie-parser");
const { doubleCsrf } = require("csrf-csrf");

const helmet = require("helmet");
// express-mongo-sanitize replaced with inline middleware below (Express 5 compatibility)
// const xss = require("xss-clean"); // Sanitization
const rateLimit = require("express-rate-limit");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
// Compression middleware — gzip/brotli all responses (biggest TTFB win)
app.use(compression());

const {
  doubleCsrfProtection,
  generateToken,
  invalidCsrfTokenError,
} = require("./utils/csrf");


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
app.use(cookieParser(process.env.SECRET));
app.engine("ejs", ejsMate);
app.use(express.json());

// Trust proxy for secure cookies behind reverse proxies (Render, Heroku, etc.)
app.set("trust proxy", 1);

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.socket.io", "https://www.googletagmanager.com", "https://maps.googleapis.com", "https://cdn.jsdelivr.net", "https://translate.googleapis.com", "https://translate.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://maps.gstatic.com", "https://maps.googleapis.com", "https://www.facebook.com"],
      connectSrc: ["'self'", "https://maps.googleapis.com", "https://api.mapbox.com", "https://events.mapbox.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "https://ka-f.fontawesome.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));

// NoSQL Injection Protection — Express 5 compatible
// express-mongo-sanitize tries to reassign req.query which is read-only in Express 5.
// We sanitize only req.body and req.params (both are writable plain objects).
app.use((req, res, next) => {
  const sanitize = (obj) => {
    if (obj && typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        if (key.startsWith('$') || key.includes('.')) {
          const safeKey = key.replace(/^\$+/, '_').replace(/\./g, '_');
          obj[safeKey] = obj[key];
          delete obj[key];
          console.warn(`[Security] Sanitized suspicious key: ${key}`);
        } else if (typeof obj[key] === 'object') {
          sanitize(obj[key]);
        }
      }
    }
  };
  if (req.body) sanitize(req.body);
  if (req.params) sanitize(req.params);
  next();
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased to 1000 to prevent blocking owner/users during normal use
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Global CSRF Protection (except for specific APIs if needed)
// For now, let's just make the protection available.
// We will apply it to sensitive POST routes.

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

const DeliveryPartner = require("./data/deliveryPartner");

app.use(passport.initialize());
app.use(passport.session());

// Configure Local Strategies
passport.use('local', new LocalStrategy(Customer.authenticate()));

// Custom Serialize/Deserialize to handle multiple models
passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(async function (obj, done) {
  try {
    // Handle both new (id string) and legacy ({id, type} object) session formats
    const id = (typeof obj === 'object' && obj.id) ? obj.id : obj;
    const user = await Customer.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.danger = req.flash("danger");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;

  // Generate CSRF token (runs after session/passport — safe to call here)
  try {
    res.locals.csrfToken = generateToken(req, res);
  } catch (e) {
    res.locals.csrfToken = "";
  }

  // Default SEO Tags
  res.locals.seo = {
    title: "PASR - Kisan Sabha & Local Bazaar",
    description: "Connect with local farmers and shops on PASR. Find fresh produce, farm tools, and daily services in your neighborhood.",
    keywords: "pasr, pasr.in, pasr market, pasr online, pasr giridih, pasr jharkhand, pasr farmers, pasr digital market, pasr website, pasr app, past in, past.in, p p market, pp market jharkhand, online market giridih, digital market giridih, 24 hours market giridih, farmers website giridih, kisan website jharkhand, online sabzi market giridih, buy vegetables online giridih, sell crops online giridih, giridih online shop, raj dhanwar online market, doranda online market, jharkhand farmers app, local business listing giridih, online dairy products giridih, sell milk online jharkhand, online goat selling giridih, poultry market online jharkhand, kisan news giridih, farmers news jharkhand, online agriculture platform india, district farmers network giridih, giridih business promotion website, digital kranti giridih, kisan digital platform, online mandi giridih, giridih bazar online, raj dhanwar bazar online, doranda bazar online, jharkhand digital bazar, local sellers website giridih, online services giridih, electrician online giridih, plumber online giridih, local mechanic giridih, property listing giridih, house rent giridih online, land sale giridih website, giridih job posting site, giridih advertisement website, free business listing giridih, small business promotion jharkhand, rural ecommerce india, village digital market jharkhand, kisan connect giridih, online fertilizer shop giridih, tractor service giridih, agriculture tools online giridih, farm equipment giridih, pasr news section, pasr farmer community, pasr online mandi, pasr jharkhand market, pasr digital india, pasr local platform, pasr rajdhanwar, pasr doranda, pasr kisan app, pasr business portal, pasr advertisement site, pasr farmers network, pasr online bazar, pasr district market, pasr agriculture news, pasr buy sell platform, pasr marketplace, pasr india, pasr rural market, pasr farmer support, pasr online promotion, pasr india website, pasr farmer group, pasr online service listing, pasr local business site, pasr digital shop, pasr ecommerce jharkhand, pasr giridih district, pasr rural ecommerce, pasr krishi platform, pasr mandi online, pasr digital business, pasr 24 hours market, pasr online store, pasr jharkhand farmers, pasr digital advertisement, pasr kisan news portal, pasr village market, pasr business growth platform, pasr community market",
    image: "https://www.pasr.in/images/icon.jpeg",
    url: "https://www.pasr.in" + req.originalUrl,
  };

  // Default UI Flags (Restores styling for profile and category pages)
  res.locals.useProfileCss = true;
  res.locals.useInsideCateCss = true;
  res.locals.useMaps = false;

  res.locals.optimizeImage = (url) => {
    if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return url;
    return url.replace('/upload/', '/upload/f_auto,q_auto/');
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
app.use("/admin", require("./routes/admin.js"));
app.use("/delivery", require("./routes/delivery.js"));
app.use("/api/cart", require("./routes/cart.js"));
app.use("/api/orders", require("./routes/order.js"));
app.use("/api/products", require("./routes/apiProduct.js"));
app.use("/api", require("./routes/itemRegistry.js"));
app.use("/api/notifications", require("./routes/apiNotification.js"));
app.use("/api/fcm", require("./routes/fcm.js"));


app.use((req, res, next) => {
  next(new ExpressError(404, "Page not found!"));
});
app.use((err, req, res, next) => {
  if (err.code === "EBADCSRFTOKEN" || err === invalidCsrfTokenError) {
    req.flash("danger", "Form security expired. Please try again.");
    return res.status(403).redirect("back");
  }
  let { statusCode = Number(err.statusCode) || 500, message = "Something Went wrong!" } = err;
  // Ensure csrfToken is available even in error views
  if (!res.locals.csrfToken) {
    try {
      res.locals.csrfToken = generateToken(req, res);
    } catch (e) {
      res.locals.csrfToken = "";
    }
  }
  res.status(statusCode).render("pages/error.ejs", { message });
});

const server = app.listen(process.env.PORT || 8080, (req, res) => {
  console.log("listening to port 8080");
});

// Socket.io Setup
const { Server } = require("socket.io");
const io = new Server(server);
require("./services/socketService")(io);

// Initialize Services
require("./services/notificationService");

