const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const passport = require('passport');
const session = require('express-session');
const cookie = require('cookie-parser');
const morgan = require('morgan');

const db = require('./models');
const passportConfig = require('./passport');
const app = express();

db.sequelize.sync();
passportConfig();

// express middleware parsing code
// morgan => request를 console에 찍어줌.
app.use(morgan('dev'));
// cors => 해당 주소에 대한 액세스 허용
app.use(cors('http://localhost:3000'));
app.use(express.json());
app.use(express.urlencoded({ extended: false}));
// cookie => 쿠키 파싱
app.use(cookie('cookiesecret'));
// session => 세션 정의를 위한 미들웨어. secret = cookie 해석에 필요한 키
app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: 'cookiesecret',
}));
// passport => 로그인 모듈
// 로그인, 로그아웃 (reqeust response조작 ex. req.login / req.logout)
app.use(passport.initialize());
// 사용자 세션
app.use(passport.session());

app.get('/', (req, res) => {
    res.status(200).send('Test nodemon');
});

// 회원가입
app.post('/user', async (req, res, next) => {
    try{
        const hash = await bcrypt.hash(req.body.password, 10);
        const exUser = await db.User.findOne({
            where: {
                email: req.body.email,
            },
        });
        if (exUser) {
            // 회원가입이 된 이메일인가?
            // 403은 액세스 금지 => 대부분 에러를 따로 정의
            return res.status(403).json({
                errorCode: 1,
                message: '이미 회원가입 된 계정입니다.'
            });
        }
        const newUser = await db.User.create({
            email: req.body.email,
            password: hash,
            nickname: req.body.nickname,
        });
        console.log('보내기 전에 확인',newUser);
        return res.status(201).json(newUser);
    } catch (err) {
        console.log(err);
        return next(err);
    }
});

// 로그인
// 쿠키 정보는 connect.sid란 이름으로 req.login이 알아서 내려줌.
app.post('/user/login', (res, req, next) => {
    passport.authenticate('local', (err, user, info) => {
        // error 발생
        if (err) {
            console.log(err);
            return next(err);
        }
        // 잘못된 정보 요청
        if (info) {
            return res.status(401).send(info.reason);
        }
        return req.login(user, async (err) => {
            // 세션에 사용자 정보 저장, 저장 방법 = serializeUser
            if (err) {
                console.log(err);
                return next(err);
            }
            // 쿠키는 header, body는 옵션 -> 여기선 유저 정보를 내려줌.
            return res.json(user);
        });
    })(req, res, next);
});

// http = 80 포트
// https = 443 포트
app.listen(3085, () => {
    console.log(`백엔드 서버 ${3085}번 포트에서 작동 중.`);
});