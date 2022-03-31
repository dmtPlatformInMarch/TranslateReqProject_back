const express = require('express');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const cookie = require('cookie-parser');
const morgan = require('morgan');
const hpp = require('hpp');
const helmet = require('helmet');
const dotenv = require('dotenv');

const prod = process.env.NODE_ENV === 'production';
const db = require('./models');
const passportConfig = require('./passport');
const userRouter = require('./routes/user');
const requestRouter = require('./routes/request');
const requestsRouter = require('./routes/requests');
const adminRouter = require('./routes/admin');

const app = express();

dotenv.config();
// force = true 테이블을 전부 날림.
db.sequelize.sync({ force: false })
    .then(() => {
        console.log('DB 연결');
    })
    .catch((err) => {
        console.log(err);
    });
passportConfig();

const whitelist = ["https://dmtlabs.kr", "https://www.dmtlabs.kr"]

// 개발/배포 미들웨어 제어
if (prod) {
    app.use(helmet());
    app.use(hpp());
    app.use(morgan('combined'));
    // cors => 해당 주소에 대한 액세스 허용
    app.use(cors({
        origin: function (origin, callback) {
            console.log("origin : " + origin);

            if (!origin) return callback(null, true);
            if (whitelist.indexOf(origin) === -1) {
                return callback(new Error("허용하지 않는 Origin입니다!"));
            }
            return callback(null, true);
        },
        credentials: true,
    }));
} else {
    // express middleware parsing code
    // morgan => request를 console에 찍어줌.
    app.use(morgan('dev'));
    // cors => 해당 주소에 대한 액세스 허용
    app.use(cors({
        origin: 'http://localhost:3080',
        credentials: true,
    }));
}

app.use('/', express.static('uploads'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// cookie => 쿠키 파싱
app.use(cookie(process.env.COOKIE_SECRET));
// session => 세션 정의를 위한 미들웨어. secret = cookie 해석에 필요한 키
app.use(session({
    proxy: true,
    resave: false,
    saveUninitialized: false,
    secret: process.env.COOKIE_SECRET,
    cookie: {
        httpOnly: false,
        secure: true,
        domain: prod && '.dmtlabs.kr',
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
app.use('/requests', requestsRouter);
app.use('/admin', adminRouter);

app.get('/', (req, res) => {
    res.status(200).send('[DMTlabs] Web Translate Service Backend');
});

// http = 80 포트
// https = 443 포트
// localhosy = 3085 포트
app.listen(prod ? process.env.PORT : 3085, () => {
    console.log(`백엔드 서버 ${prod ? process.env.PORT : 3085}번 포트에서 작동 중.`);
});