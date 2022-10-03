var express = require('express');
const app = express();
const session = require('express-session');
const bodyParser = require('body-parser');
const http = require('http').createServer(app);
var crypto = require('crypto');
var async = require('async');

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
    cry: {
        cryCount: String,
        reason: String,
        visable: Boolean,
        date: Date
    }
});


var userModel = mongoose.model('users', userSchema);
var cryModel = mongoose.model('cry', crySchema)

app.get('/', function (req, res) {
    if (!req.session.user) {
        return res.redirect('/login');
    } else {
        res.render('index');
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
        password: crypto.createHash('sha256').update(req.body.password).digest('base64')
    }, function (err, user) {
        if (!user) {
            res.redirect('/login?error=true');
        } else {
            req.session.user = user._id;
            res.redirect('/');
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
                user: user._id,
                display: user.display
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

app.post('/register', function (req, res) {
    userModel.find({
        username: req.body.username
    }, function (err, users) {
        if (!users.length) {
            var user = new userModel({
                username: req.body.username,
                password: crypto.createHash('sha256').update(req.body.password).digest('base64')
            });
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
    console.log(req.body);

    async.waterfall([
        function (callback) {
            userModel.findOne({ _id: req.session.user }, function (err, result) {
                if (err || !result) {
                    callback(err);
                } else {
                    callback(null, result);
                }
            });
        },
        function (result, callback) {
            let newCry = cryModel({
                user: result._id,
                cry: {
                    'cryCount': req.body.cryNumber,
                    'reason': req.body.cryReason,
                    'visable': req.body.cryVisable == "on" ? true : false,
                    'date': new Date()
                }
            });
            newCry.save(function (err) {
                if (!err) {
                    callback(null);
                } else {
                    callback(err);
                    console.log(err);
                }
            });
        }],
        function (err) {
            if (err) {
                console.log(err);
            }
            else {
                res.render('cryCount');
            }
        }
    );
});

app.get('/cryCount', function (req, res) {
    if (!req.session.user) {
        return res.redirect('/login');
    } else {
        async.waterfall([
            function (callback) {
                userModel.findOne({ _id: req.session.user }, function (err, result) {
                    if (err || !result) {
                        callback(err);
                    } else {
                        callback(null, result);
                    }
                });
            },
            function (result, callback) {
                cryModel.find({ user: result._id }, function (err, result) {
                    if (err || !result) {
                        callback(err);
                    } else {
                        callback(null, result);
                    }
                });

            },
            function (result, callback) {
                res.render('cryCount',
                    { cryInfo: result});
                callback(null);
            }
        ],
            function (err) {
                if (err) {
                    console.log(err);
                }
            });
    }
});

http.listen(3000, () => {
    console.log('server started');
});