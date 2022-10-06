var express = require('express');
const app = express();
const session = require('express-session');
const bodyParser = require('body-parser');
const http = require('http').createServer(app);
const bcrypt = require('bcrypt');

app.use(bodyParser.urlencoded({
    extended: true
}));

var sessionMiddleware = session({
    secret: 'Celt-X-PROTECT-YOUR-COOKIES'
});

app.use(sessionMiddleware);
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'pug');

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/cry-count', {
    useNewUrlParser: true,
});

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
var ObjectId = mongoose.Schema.ObjectId;

const userSchema = mongoose.Schema({
    username: {
        type: String, unique: true, required: true, index: {
            collation: {
                locale: 'en_US',
                strength: 1
            }
        }
    },
    password: String
});

const crySchema = new mongoose.Schema({
    user: ObjectId,
    date: Date
});

var userModel = mongoose.model('users', userSchema);
var cryModel = mongoose.model('cry', crySchema)

app.get('/', function (req, res) {
    if (!req.session.user) {
        return res.redirect('/login');
    } else {
        res.render('index')
    }
});

app.get('/login', function (req, res) {
    res.render('login', {
        loginError: req.query.error
    });
});

app.post('/login', function (req, res) {
    userModel.findOne({
        username: req.body.username,
    }, async function (err, user) {
        if (!user) {
            res.redirect('/login?error=true');
        } else {
            const validPassword = await bcrypt.compare(req.body.password, user.password);
            if (validPassword) {
                req.session.user = user._id;
                req.session.username = user.username;
                res.redirect('/');
            } else {
                res.redirect('/login?error=true');
            }
        }
    })
});

app.get('/logout', function (req, res) {
    if (req.session) {
        req.session.destroy(function (err) {
            return res.redirect('/');
        });
    }
});

app.get('/whoami', function (req, res) {
    userModel.findOne({
        _id: req.session.user
    }, function (err, user) {
        if (user) {
            res.json({
                user: user.username
            })
        } else {
            res.json({});
        }

    });

});

app.get('/register', function (req, res) {
    res.render('register', {
        userExists: req.query.exists
    });
});

app.post('/register', async function (req, res) {
    const salt = await bcrypt.genSalt(10);
    var user = new userModel({
        username: req.body.username,
        password: await bcrypt.hash(req.body.password, salt)
    });
    userModel.find({
        username: req.body.username
    }, function (err, users) {
        if (err) {
            res.send("error registering");
        }
        if (!users.length) {
            user.save(function (err) {
                res.redirect('/login');
            });
        } else {
            res.redirect('/register?exists=true');
        }
    })
});

app.get('/addCry', function (req, res) {
    if (!req.session.user) {
        return res.redirect('/login');
    } else {
        res.render('addCry');
    }
});

app.post('/addCry', function (req, res) {
    let newCry = cryModel({
        user: req.session.user,
        date: new Date()
    });

    newCry.save(function (err) {
        if (!err) {
            res.redirect('/');
        } else {
            res.send('error saving data to database. please try again later.')
        }
    });
});

app.get('/totalcries', function (req, res) {
    let query = {};
    let retVal = {};
    if(req.query && req.query.user){
        query  ={ user: req.session.user };
        retVal = {username: req.session.username}
    }
    cryModel.count(query, function (err, count) {
        if (err) {
            res.json({});
        } else {
            retVal.totalCries = count;
            res.json(retVal)
        }
    });
});



http.listen(3000, () => {
    console.log('server started');
});
