var express = require('express');
const app = express();
const http = require('http').createServer(app);

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/test');

app.use(express.static(__dirname + '/public'));

app.set('view engine', 'pug');

const userSchema = mongoose.Schema({
    username: {
        type: String, unique: true, required: true, index: {
            collation: {
                locale: 'en_US',
                strength: 1
            }
        }
    },
    password: String,
    cryCount: String
});


app.get('/', function (req, res) {
    res.render('index');
});

app.get('/login', function (req, res){
    res.render('login');
});

app.get('/register', function (req, res){
    res.render('register');
});

http.listen(3000, () => {
    console.log('server started');
});