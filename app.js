
var express = require("express"),
  bodyParser = require("body-parser"),
  passport = require("passport"),
  passportLocal = require("passport-local"),
  cookieParser = require("cookie-parser"),
  session = require("cookie-session"),
  db = require("./models/index"),
  methodOverride = require("method-override")
  flash = require('connect-flash'),
  app = express();
  var morgan = require('morgan');
  var routeMiddleware = require("./config/routes");



app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({extended:true}));
app.use(methodOverride('_method'));





//////////////// AUTHENTICATE ROUTES /////////////////

app.use(session( {
  secret: '12345',
  name: '12345',
  // this is in milliseconds
  maxage: 3600000
  })
);

// function checkAuthentication(req, res, next) {
//   if (!req.user) {
//     res.render('login', {message: req.flash('loginMessage'), username: ""});
//   }
//   else {
//    return next();
//   }
// }

// function preventLoginSignup(req, res, next) {
//   if (req.user) {
//     res.redirect('/home');
//   }
//   else {
//    return next();
//   }
// }

// get passport started
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// prepare our serialize functions
passport.serializeUser(function(user, done){
  console.log("SERIALIZED JUST RAN!");
  done(null, user.id);
});

passport.deserializeUser(function(id, done){
  console.log("DESERIALIZED JUST RAN!");
  db.User.find({
      where: {
        id: id
      }
    })
    .done(function(error,user){
      done(error, user);
    });
});
app.get('/', routeMiddleware.preventLoginSignup, function(req,res){
    res.render('index');
});

app.get('/signup', routeMiddleware.preventLoginSignup, function(req,res){
    res.render('signup', { username: ""});
});

app.get('/login', routeMiddleware.preventLoginSignup, function(req,res){
    res.render('login', {message: req.flash('loginMessage'), username: ""});
});

app.get('/home', routeMiddleware.checkAuthentication, function(req,res){
  db.User.find(req.user.id).done(function(err,user){
    user.getPosts({order: [['createdAt', 'DESC']]}).done(function(err,posts){
      res.render("user/allposts", {allPosts:posts, user: req.user});    
    })
  })
});

// on submit, create a new users using form values
app.post('/submit', function(req,res){

  db.User.createNewUser(req.body.username, req.body.password,
  function(err){
    res.render("signup", {message: err.message, username: req.body.username});
  },
  function(success){
    res.render("index", {message: success.message});
  });
});

// authenticate users when logging in - no need for req,res passport does this for us
app.post('/login', passport.authenticate('local', {
  successRedirect: '/home',
  failureRedirect: '/login',
  failureFlash: true
}));

app.get('/logout', function(req,res){
  //req.logout added by passport - delete the user id/session
  req.logout();
  res.redirect('/');
});


///////////////// USER ROUTES  ///////////////////


//All Users
// app.get('/users', function(req, res){
//   db.User.findAll().success(function(user){
//     res.render('user/allposts', {alluser: user});
//   });
// });

//Create
app.post('/user', function(req, res) {
  var username = req.body.user.first_name;
  db.user.create({
    username: username,
  }).success(function(){
    res.redirect('/user');
  });
});

//Show
app.get('/user/:id/post', function(req, res) {
  db.user.find(req.params.id).done(function(err,user){
    user.getPosts().done(function(err,posts){
      res.render('user/show', {allPosts: posts, user:user});
    });
  });
});

//Edit
app.get('/user/:id/edit', function(req, res) {
  //find our user
  var id = req.params.id;
  db.User.find(id).success(function(user){
    res.render('post/edit', {user: user});
  });
});

//Update
app.put('/user/:id', function(req, res) {
  var id = req.params.id;
  db.user.find(id).success(function(user){
    user.updateAttributes({
      first_name: req.body.user.first_name,
      last_mname: req.body.user.last_name
    }).success(function(){
      res.redirect('/user');
    });
  });
});

//Delete
app.delete('/user/:id', function(req, res) {
  var id = req.params.id;
  db.user.find(id).success(function(user){
    db.Post.destroy({
      where: {
        UserId: user.id
      }
    }).success(function(){
      user.destroy().success(function(){
        res.redirect('/user');
        });
      });
    });
  });



//////// POSTS (To_Don't) ROUTES ////////////

//Index
app.get('/', function(req, res){
  //validate if logged in, if not redirect to /login
  //find user, then find all their posts
  db.Post.findAll().done(function(err,posts){
    res.render('post/index', {allPosts: posts});
  });	
});

//New
app.get('/post/:id/new', function(req, res){
  var id = req.params.id;
  res.render("post/new", {id:id, title:"",post:"", user:req.user});
});

//Create
app.post('/post/:id', function(req, res) {
  console.log(req.body)
  var UserId = req.params.id;
  var title = req.body.title;
  var body = req.body.body;

  db.Post.create({
    title: title,
    body: body,
    UserId: UserId
  }).done(function(err,success) {
    console.log("SOME SHIT WENT WRONG", err)
    if(err) {
      var errMsg = "title must be at least 6 characters";
      res.render('post/new',{errMsg:errMsg, id:UserId, title:title, body:body});
    }
    else{
      res.redirect('/home');
    }
  });
});

//Show
app.get('/post/:id', function(req, res) {
  db.Post.find(req.params.id).done(function(err,post){
    res.render('post/show', {post: post});
  });
});

//Edit
app.get('/post/:id/edit', function(req, res) {
  //find our post
  var id = req.params.id;
  db.Post.find(id).done(function(err,post){
    res.render('post/edit', {post: post, user: req.user});
  });
});

//Update
app.put('/post/:id', function(req, res) {
  var id = req.params.id;
  db.Post.find(id).done(function(err,post){
      post.updateAttributes({
      title: req.body.title,
      body: req.body.body
    }).done(function(err,success){
      if(err) {
        var errMsg = "title must be at least 6 characters";
        res.render('post/edit',{post: post, errMsg:errMsg});
      }
      else{
        res.redirect('/home');
      }
     });
    });
  });


//Delete
app.delete('/post/:id', function(req, res) {
  var id = req.params.id;
  db.Post.find(id).done(function(err,post){
    post.getUser().done(function(err,user){
      post.destroy().done(function(err,success){
        res.redirect('/home');
      });
    });
  });
});

// catch-all for 404 errors
app.get('*', function(req,res){
  res.status(404);
  res.render('404');
});


app.listen(3000, function(){
  "Server is listening on port 3000";
});
