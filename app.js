const express = require('express');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const cookie = require('cookie-parser');
const morgan = require('morgan');

const db = require('./models');
const passportConfig = require('./passport');
const userRouter = require('./routes/user');
const requestRouter = require('./routes/request');
const app = express();

db.sequelize.sync({ force: false })
    .then(() => {
        console.log('DB 연결');
    })
    .catch((err) => {
        console.log(err);
    });
passportConfig();

// express middleware parsing code
// morgan => request를 console에 찍어줌.
app.use(morgan('dev'));
// cors => 해당 주소에 대한 액세스 허용
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
}));
app.use('/', express.static('uploads'));
app.use(express.json());
app.use(express.urlencoded({ extended: false}));
// cookie => 쿠키 파싱
app.use(cookie('cookiesecret'));
// session => 세션 정의를 위한 미들웨어. secret = cookie 해석에 필요한 키
app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: 'cookiesecret',
    cookie: {
        httpOnly: true,
        secure: false,
    },
}));
// passport => 로그인 모듈
// 로그인, 로그아웃 (reqeust response조작 ex. req.login / req.logout)
app.use(passport.initialize());
// 사용자 세션
app.use(passport.session());
// 라우터
app.use('/user', userRouter);
app.use('/request', requestRouter);

app.get('/', (req, res) => {
    res.status(200).send('Test nodemon');
});

// http = 80 포트
// https = 443 포트
app.listen(3085, () => {
    console.log(`백엔드 서버 ${3085}번 포트에서 작동 중.`);
});