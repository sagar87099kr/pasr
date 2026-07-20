
const compression = require("compression");
const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const Customer = require("./data/customers.js");
const Shop = require("./data/shops.js");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const ExpressError = require("./utils/expressError.js");
const cors = require("cors");
require('dotenv').config();

// Enable CORS for API requests from Flutter/Mobile
app.use(cors({ origin: '*' }));

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

const clientPromise = mongoose.connect(dbUrl, { family: 4, tlsInsecure: true })
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

const helmet = require("helmet");
// express-mongo-sanitize replaced with inline middleware below (Express 5 compatibility)
// const xss = require("xss-clean"); // Sanitization
const rateLimit = require("express-rate-limit");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../frontend/views"));
// Compression middleware — gzip/brotli all responses (biggest TTFB win)
app.use(compression());




// Serve assetlinks.json explicitly since express.static ignores dotfiles by default
app.use((req, res, next) => {
    next();
});

app.get("/.well-known/assetlinks.json", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/public", ".well-known", "assetlinks.json"));
});

// Serve static files with long cache headers (1 year for assets)
app.use(express.static(path.join(__dirname, "../frontend/public"), {
  maxAge: '1y',
  etag: true,
  lastModified: true,
}))
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(methodOverride("_method"));
app.use(cookieParser(process.env.SECRET));
app.engine("ejs", ejsMate);
app.use(express.json({ limit: '50mb' }));

// Trust proxy for secure cookies behind reverse proxies (Render, Heroku, etc.)
app.set("trust proxy", 1);

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.socket.io", "https://www.googletagmanager.com", "https://maps.googleapis.com", "https://maps.gstatic.com", "https://cdn.jsdelivr.net", "https://translate.googleapis.com", "https://translate.google.com", "https://connect.facebook.net", "https://www.gstatic.com", "https://apis.google.com", "https://checkout.razorpay.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://www.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://api.qrserver.com", "https://res.cloudinary.com", "https://maps.gstatic.com", "https://maps.googleapis.com", "https://www.facebook.com", "https://fonts.gstatic.com", "*.googleapis.com", "*.gstatic.com", "https://images.unsplash.com", "https://plus.unsplash.com", "https://lh3.googleusercontent.com", "https://lh4.googleusercontent.com", "https://lh5.googleusercontent.com", "https://lh6.googleusercontent.com", "blob:"],
      connectSrc: ["'self'", "https://maps.googleapis.com", "https://maps.gstatic.com", "https://translate.googleapis.com", "https://api.mapbox.com", "https://events.mapbox.com", "https://*.googleapis.com", "https://*.firebaseio.com", "wss://*.firebaseio.com", "https://*.gstatic.com", "https://*.razorpay.com", "https://checkout.razorpay.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "https://ka-f.fontawesome.com"],
      frameSrc: ["'self'", "https://*.razorpay.com", "https://checkout.razorpay.com"],
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
  mongoUrl: dbUrl,
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

    if (!id) return done(null, null);

    const mongoose = require('mongoose');
    // Try to find by MongoDB ObjectId first (standard format)
    if (mongoose.Types.ObjectId.isValid(id)) {
      const user = await Customer.findById(id);
      if (user) return done(null, user);
    }

    // Fallback: id might be a phone number (number or string)
    // This happens when passport-local-mongoose serialized the username field instead of _id in older versions or specific configs
    console.warn(`[Passport] Non-ObjectId session ID encountered: ${id}. Attempting lookup by username.`);
    const userByUsername = await Customer.findOne({ username: id });

    if (!userByUsername) {
      console.warn(`[Passport] User lookup failed for ID/Username: ${id}`);
    }

    return done(null, userByUsername || null);
  } catch (err) {
    console.error(`[Passport] Deserialization error for ${JSON.stringify(obj)}:`, err);
    done(null, null); // Don't propagate — just treat as logged-out
  }
});


const SiteStat = require("./data/siteStats.js");
let todayVisitsCache = { date: '', count: 0, lastFetched: 0 };

// Global middleware
app.use(async (req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.danger = req.flash("danger");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  res.locals.bazaarName = req.session.bazaarName || null;
  const admins = ["8709956547", "7091212569", "7046699074", "9304703911", "8873679038", "7091568049", "9835780962", "9352462475"];
  res.locals.isAdmin = req.user && admins.includes(String(req.user.username));
  res.locals.csrfToken = ""; // Placeholder for views that still expect this variable
  res.locals.cartItemCount = (req.session && req.session.cart && req.session.cart.items) ? req.session.cart.items.length : 0;

  // Retrieve user shops for the "+" add-item shortcut in navbar
  if (req.user) {
    try {
      const userShops = await Shop.find({ owner: req.user._id }).select("_id shopName");
      res.locals.userShops = userShops.map(s => ({ id: s._id.toString(), name: s.shopName }));
    } catch (err) {
      console.error("Error retrieving user shops in global middleware:", err);
      res.locals.userShops = [];
    }
  } else {
    res.locals.userShops = [];
  }

  // Daily Visitor Tracking & Stats Fetching
  const tzDate = new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"});
  const d = new Date(tzDate);
  const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  
  const isPageView = req.method === 'GET' && !req.xhr && !req.headers.accept?.includes('application/json') && !req.path.startsWith('/api') && !req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|map|woff|woff2)$/i);
  
  if (isPageView) {
      if (req.cookies.visited_today !== today) {
          res.cookie('visited_today', today, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
          SiteStat.findOneAndUpdate(
              { date: today },
              { $inc: { visits: 1 } },
              { upsert: true, new: true }
          ).then(stat => {
              if (stat) todayVisitsCache = { date: today, count: stat.visits, lastFetched: Date.now() };
          }).catch(err => console.error("SiteStat background update error:", err.message));
      }
  }

  // Throttled cache refresh (every 5 minutes or on new day)
  if (todayVisitsCache.date !== today || Date.now() - todayVisitsCache.lastFetched > 5 * 60 * 1000) {
      SiteStat.findOne({ date: today }).then(stat => {
          todayVisitsCache = {
              date: today,
              count: stat ? stat.visits : 0,
              lastFetched: Date.now()
          };
      }).catch(err => console.error("SiteStat cache refresh error:", err.message));
  }

  res.locals.todayVisits = todayVisitsCache.count;

  // Default SEO Tags
  res.locals.seo = {
    title: "PASR - Kisan Sabha & Local Bazaar",
    description: "Connect with local farmers and shops on PASR. Find fresh produce, farm tools, and daily services in your neighborhood.",
    keywords: "pasr, pasr.in, pasr market, pasr online, pasr giridih, pasr jharkhand, pasr farmers, pasr digital market, pasr website, pasr app, past in, past.in, p p market, pp market jharkhand, online market giridih, digital market giridih, 24 hours market giridih, farmers website giridih, kisan website jharkhand, online sabzi market giridih, buy vegetables online giridih, sell crops online giridih, giridih online shop, raj dhanwar online market, doranda online market, jharkhand farmers app, local business listing giridih, online dairy products giridih, sell milk online jharkhand, online goat selling giridih, poultry market online jharkhand, kisan news giridih, farmers news jharkhand, online agriculture platform india, district farmers network giridih, giridih business promotion website, digital kranti giridih, kisan digital platform, online mandi giridih, giridih bazar online, raj dhanwar bazar online, doranda bazar online, jharkhand digital bazar, local sellers website giridih, online services giridih, electrician online giridih, plumber online giridih, local mechanic giridih, property listing giridih, house rent giridih online, land sale giridih website, giridih job posting site, giridih advertisement website, free business listing giridih, small business promotion jharkhand, rural ecommerce india, village digital market jharkhand, kisan connect giridih, online fertilizer shop giridih, tractor service giridih, agriculture tools online giridih, farm equipment giridih, pasr news section, pasr farmer community, pasr online mandi, pasr jharkhand market, pasr digital india, pasr local platform, pasr rajdhanwar, pasr doranda, pasr kisan app, pasr business portal, pasr advertisement site, pasr farmers network, pasr online bazar, pasr district market, pasr agriculture news, pasr buy sell platform, pasr marketplace, pasr india, pasr rural market, pasr farmer support, pasr online promotion, pasr india website, pasr farmer group, pasr online service listing, pasr local business site, pasr digital shop, pasr ecommerce jharkhand, pasr giridih district, pasr rural ecommerce, pasr krishi platform, pasr mandi online, pasr digital business, pasr 24 hours market, pasr online store, pasr jharkhand farmers, pasr digital advertisement, pasr kisan news portal, pasr village market, pasr business growth platform, pasr community market",
    image: "https://www.pasr.in/images/icon.jpeg",
    url: "https://www.pasr.in" + req.originalUrl,
  };

  // Default UI Flags
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
app.use("/api/payment", require("./routes/payment.js"));
app.use("/api/bazaars", require("./routes/bazaar.js"));
app.use("/api", require("./routes/api-partner.js"));
app.use("/api/admin", require("./routes/adminApi.js"));
app.use((req, res, next) => {
  next(new ExpressError(404, "Page not found!"));
});

app.use((err, req, res, next) => {
  let { statusCode = Number(err.statusCode) || 500, message = "Something Went wrong!" } = err;
  // For API routes, always return JSON so fetch() can parse it
  if (req.path.startsWith('/api/') || req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(statusCode).json({ success: false, message });
  }
  res.locals.csrfToken = "";
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
require("./utils/cronJobs");

