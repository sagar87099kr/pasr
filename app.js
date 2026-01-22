
const express = require("express");
const app = express();
const path = require("path");
const mongoose= require("mongoose");
const methodOverride = require("method-override");
const ejsMate= require("ejs-mate"); 
const Customer = require("./data/customers.js");
const Provider = require("./data/serviceproviders.js");
const Review = require("./data/review.js");
const Availability = require("./data/clander.js");
const multer = require("multer");
const {storage} = require("./cloud_con.js");
const upload = multer( {storage} );
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/expressError.js");
const { wrap } = require("module");
const cookie = require("express-session/session/cookie.js");
const { connect } = require("http2");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const {isLogedin, saveRedirectUrl, isOwner, validateprovider,validatecustomer,validatereview,isReviewAuthor,isVerifiedCustomer, isadmin } = require("./middeleware.js");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const { error } = require("console");
require('dotenv').config();
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });
const Shedule = require("./data/clander.js");
const { customerSchema } = require("./schema.js");

// const MON_URL = "mongodb://127.0.0.1:27017/pasr"
const dbUrl = process.env.ATLAS_DB_URL;
if (!dbUrl) {
  throw new Error("ATLAS_DB is missing in your .env file");
}
main()
.then(() => {
    console.log("connected to databases");
}).catch((err)=>{
    console.log(err);
});

async function main() {
    await mongoose.connect(dbUrl)   
};

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public" )))
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.json());
const store = MongoStore.create({
  mongoUrl: dbUrl,
  crypto: {
    secret: process.env.SECRET, // encrypt session in DB
  },
  touchAfter: 7*24 * 3600, // reduce DB writes
});
store.on("error", (err) => {
  console.log("SESSION STORE ERROR:", err);
});
app.use(
  session({
    // store,
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


// app.use(session(sessionOptions));

// app.use(
//   session({
//     store: new FileStore({
//       path: "./sessions",
//       retries: 1,
//       ttl: 14 * 24 * 60 * 60, // seconds
//     }),
//     secret: process.env.SECRET,
//     resave: false,
//     saveUninitialized: false,
//     cookie: {
//       httpOnly: true,
//       expires: Date.now() + 14 * 24 * 60 * 60 * 1000,
//       maxAge: 14 * 24 * 60 * 60 * 1000,
//     },
//   })
// );
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
// step 1
passport.use(new LocalStrategy(Customer.authenticate()));

// step 2
passport.serializeUser(Customer.serializeUser() );

// step 3
passport.deserializeUser(Customer.deserializeUser());

app.use((req,res, next)=>{
    res.locals.success = req.flash("success");
    res.locals.danger = req.flash("danger");
    res.locals.currUser = req.user;
    next();
});

// help route
app.get("/help", (req,res)=>{
    res.render("pages/help.ejs");
});
app.get("/privacy", (req,res)=>{
  res.render("pages/privacy.ejs")
})

// terms and condition route  
app.get("/T&C", (req,res)=>{
    res.render("pages/T&C.ejs");
});

// login route for all 
app.get("/signup", (req,res)=>{
    res.render("pages/signup.ejs");
});

// login route for customer.
app.get("/customer/signup", (req,res)=>{
    res.render("pages/customer.ejs");
});
// we will take the post request here and save it in our data bases
app.post("/customer/signup",validatecustomer ,wrapAsync(async(req,res, next) => {
    let coordinate = await geocodingClient.forwardGeocode({
    query: req.body.customer.address,
    limit: 1
    })
    .send();
    try {
      const { name, username, password, address,pincode,emailAddress } = req.body.customer;
      const geometry = coordinate.body.features[0].geometry;
      const newCustomer = new Customer({
        name,
        username,
        emailAddress,
        address,
        geometry,
        pincode,
      });

      // Register user (this saves to DB)
      const registeredUser = await Customer.register(newCustomer, password);

      // LOGIN AFTER SIGNUP
      req.login(registeredUser, (err) => {
        if (err) return next(err);

        req.flash(
          "success",
          `Welcome to PaSr. Thank you for signup ${name}`
        );
        res.redirect("/home");
      });

    } catch (e) {
      console.log(e);

      if (e.message.includes("User already exists")) {
        req.flash("danger", "Username already registered");
      } else {
        req.flash("danger", e.message);
      }

      res.redirect("/customer/signup");
    }
  })
);
// this is going to be the home route for the customer
app.get("/home" , (req, res) => {
    res.render("pages/home.ejs")
});
// this will redirect into farmer page
app.get("/farm",isLogedin ,wrapAsync(async (req,res)=>{
   const allProvider = await Provider.find({categories:"Farming Vehicles",verified:true}).populate("owner");  
   res.render("pages/farming.ejs", {allProvider});
}));
// this will redirect the page to the fourwheeler page
app.get("/car",isLogedin, wrapAsync(async (req,res)=>{
    const allProvider = await Provider.find({categories:"Four Wheelers",verified:true}).populate("owner");  
    res.render("pages/four_wheelers.ejs", {allProvider});
    
}));
// profile route
app.get("/provider/:id/profile",isLogedin,wrapAsync(async (req,res)=>{
    let {id} = req.params;
    const providerData= await Provider.findById(id)
    .populate([
      {path:"owner"},
      {path: "review",
    populate:{path: "author",
    },
    }]);
    const doc = await Shedule.findOne({ listingId: providerData._id }).lean();
    res.render("pages/profile.ejs",{providerData,currUser: req.user, existingDays: doc?.days || []});
}));
// this will redirect the paget bus
app.get("/bus",isLogedin, wrapAsync(async (req,res)=>{
    const allProvider = await Provider.find({categories:"HMV (Bus)",verified:true}).populate("owner");
    console.log(allProvider) 
    res.render("pages/bus.ejs", {allProvider});
}));
// three wheelers
app.get("/three-weelers", isLogedin, wrapAsync(async (req,res)=>{
    const allProvider = await Provider.find({categories:"Three Wheelers",verified:true}).populate("owner");  
    res.render("pages/three.ejs", {allProvider});
    
}));
// caretings
app.get("/caterings",isLogedin, wrapAsync(async(req,res)=>{
    const allProvider = await Provider.find({categories:"Caterings",verified:true}).populate("owner");  
    res.render("pages/caterings.ejs", {allProvider});
}));
// filming pages
app.get("/filming",isLogedin, wrapAsync(async (req,res)=>{
    const allProvider = await Provider.find({categories:"Filming",verified:true}).populate("owner");  
    res.render("pages/filming.ejs", {allProvider});
    
}));
//decoration
app.get("/decor",isLogedin, wrapAsync(async(req,res)=>{
    const allProvider = await Provider.find({categories:"Decoration",verified:true}).populate("owner");  
    res.render("pages/decoration.ejs", {allProvider});
}));
// dj and tent pages
app.get("/djdecor",isLogedin, wrapAsync(async(req,res)=>{
    const allProvider = await Provider.find({categories:"DJ and Tent",verified:true}).populate("owner");  
    res.render("pages/djtant.ejs", {allProvider});
}));
// band party 
app.get( "/bandparty",isLogedin, wrapAsync(async (req, res) =>{
    const allProvider = await Provider.find({categories:"Band Party",verified:true}).populate("owner");  
    res.render("pages/bandparty.ejs", {allProvider});
}));
// heavy equipments
app.get("/heavy",isLogedin, wrapAsync(async(req,res)=>{
    const allProvider = await Provider.find({categories:"Heavy Equipments",verified:true}).populate("owner");  
    res.render("pages/Heavy_equipments.ejs", {allProvider});
}));


// here we will get POST request send form "/providerLogin" 
// Become a provider
app.get("/become/provider",isLogedin,isVerifiedCustomer, (req,res)=>{
  res.render("pages/create.ejs")
});

app.post("/become/provider",isLogedin,isVerifiedCustomer,validateprovider, upload.array('provider[personImage]', 4), wrapAsync(async(req, res)=>{
    let{company, experience,location,phoneNO } = req.body.provider;
    let categories = req.body.provider.categories;
    const personImage = req.files;
    
    let coordinate = await geocodingClient.forwardGeocode({
    query: req.body.provider.location,
    limit: 1
    })
    .send();
    const geometry = coordinate.body.features[0].geometry;
    try{
    const newProvider = new Provider({
      categories,
      personImage,
      experience,
      company,
      location,
      geometry,
      phoneNO
    });
    newProvider.owner = req.user._id;
    await newProvider.save();
    console.log(newProvider);

      req.flash("success", `Thank you for becoming provider`);
      res.redirect("/home");
    }
    catch(e){
        console.log(e);
        req.flash("danger", e.message);
        res.redirect("/become/provider");
    }
    
}));
// This will render the form of update route.
app.get("/provider/:id/edit",
    isLogedin,
    wrapAsync(async(req,res)=>{
    let{id}= req.params;
    const data= await Provider.findById(id);
    res.render("pages/edit.ejs", {data});
}));
// update route 
app.put("/update/:id",
    isLogedin,
    isOwner,
    wrapAsync(async(req,res)=>{
    let{id}= req.params;
    let coordinate = await geocodingClient.forwardGeocode({
    query: req.body.provider.location,
    limit: 1
    })
    .send();
    const geometry = coordinate.body.features[0].geometry;
    const categories = req.body.provider.categories;
    let {discription,experience, company,location  } = req.body.provider;
    await Provider.findByIdAndUpdate(id,{discription, categories,experience, company,location, geometry});
    req.flash("success",
    "Your profile is upto date");
    res.redirect(`/provider/${id}/profile`);
    
}));
// reviews data
app.post("/:id/reviews",
    isLogedin,
    isVerifiedCustomer,
    validatereview,
    wrapAsync(async(req,res)=>{
    let{id}= req.params;
    let provider = await Provider.findById(id);    
    let newReview = new Review(req.body.review);
    newReview.author = req.user._id;
    console.log(newReview);
    provider.review.push(newReview);
    await newReview.save();
    await provider.save();
    console.log("new review was saved");
    req.flash("success", "New review is created");
    res.redirect(`/provider/${id}/profile`);
}));
// delete reviews
app.delete("/provider/:id/review/:reviewId",isLogedin,
    isReviewAuthor,
    wrapAsync(async (req,res)=>{
    let{id,reviewId}=req.params;
    await Provider.findByIdAndUpdate(id,{$pull:{review: reviewId}});
    await Review.findByIdAndDelete(reviewId);
    req.flash("danger", "You have delete this review");
    res.redirect(`/provider/${id}/profile`);
}));

// If a person has already logedin before and trying to re login for that is this the route
app.get("/alreadyLogin", (req,res)=>{
   res.render("pages/relogin.ejs")
});
app.post(
  "/alreadyLogin",
  saveRedirectUrl,
  passport.authenticate("local",{
    failureRedirect:"/alreadyLogin",
    failureFlash : "MobileNO or password is not correct",
  }),
  async(req,res)=>{
    req.flash("success", "Welcome back to PaSr. Your login is successfull");
    res.redirect("/home");
  }
  
);

app.get("/logout", (req, res, next)=>{
    req.logout((err)=>{
        if(err){
            return next(err);
        }
        req.flash("danger", "You are loged out! now");
        res.redirect("/home");
    })
})
function isISODate(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// GET page -> loads saved schedule so everyone sees the same schedule
app.get("/shedule/:id",isLogedin, isOwner, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).send("Invalid id");

    const doc = await Shedule.findOne({ listingId: id }).lean();
    res.render("shedule", { id, existingDays: doc?.days || [] });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// POST form -> saves schedule to MongoDB
app.post("/shedule/:id",isLogedin,isOwner, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).send("Invalid id");

    const raw = req.body.daysJson;
    if (!raw) return res.status(400).send("Missing daysJson");

    let parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return res.status(400).send("daysJson must be array");

    // sanitize + de-dupe
    const map = new Map();
    for (const item of parsed) {
      const date = String(item?.date || "");
      const status = String(item?.status || "");

      if (!isISODate(date)) continue;
      if (!["free", "busy"].includes(status)) continue;

      map.set(date, { date, status });
    }

    // Keep only 2026 dates
    const cleaned = Array.from(map.values())
      .filter(d => d.date.startsWith("2026-"))
      .sort((a, b) => a.date.localeCompare(b.date));

    await Shedule.findOneAndUpdate(
      { listingId: id },
      { listingId: id, days: cleaned, updatedBy: req.user?._id },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.redirect(`/provider/${id}/profile`);
  } catch (err) {
    res.status(500).send(err.message);
  }
});



/*
In app.js:
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.use(require("./routes/sheduleRoutes"));
*/

// here i am going to create a new page where people will able to see their profile. 
app.get("/user",isLogedin ,saveRedirectUrl, wrapAsync(async(req, res)=>{
    res.render("pages/provider_profile.ejs")
}));
// these are verification route for customers 
app.get("/customer/verify",isLogedin, isadmin, async(req,res)=>{
  let customers = await Customer.find();
  res.render("pages/userverification.ejs",{customers});
});
// set value true
app.put("/:id/verifycustomer",isLogedin, isadmin, async(req,res)=>{
  let{id}= req.params;
  const {verified,verifedBy} = req.body.customer;
  console.log(verified)
  await Customer.findByIdAndUpdate(id,{verified, verifedBy});
  console.log("customer is verifed");
});
// we anything suspicious delete customer from database
app.delete("/:id/verifyfail",isLogedin,isadmin, async(req,res)=>{
  let{id}= req.params;
  await Customer.findByIdAndDelete(id);
  console.log("customer is deleted");

});
// these are verification route for provider listing
app.get ("/provider/verify",isLogedin,isadmin, async(req,res)=>{
   let providers = await Provider.find().populate("owner");
  res.render("pages/providerverify.ejs",{providers});
});
app.put("/:id/verifyprovider",isLogedin,isadmin, async(req,res)=>{
  let{id}= req.params;
  const {verified,verifedBy} = req.body.provider;
  console.log(verified)
  await Provider.findByIdAndUpdate(id,{verified, verifedBy});
  console.log("provider is verifed");
});
app.delete("/:id/verifyfail",isLogedin, isadmin, async(req,res)=>{
  let{id}= req.params;
  await Provider.findByIdAndDelete(id);
  console.log("provider detail is deleted");
})
app.use( (req,res,next) => {
    next(new ExpressError(404, "Page not found!"));
});
app.use((err,req,res,next) => {
    let{statusCode = Number(err.statusCode)||500, message = "Something Went wrong!"} = err;
    res.status(statusCode).render("pages/error.ejs", {message});
    
});
app.listen(8080 ,(req, res)=>{
    console.log("listening to port 8080");
});
