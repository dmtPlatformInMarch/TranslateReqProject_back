const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const session = require('express-session');
const hpp = require('hpp');
const helmet = require('helmet');
const dotenv = require('dotenv');

const prod = process.env.NODE_ENV === 'production';
const db = require('./models/index');

const passport = require('passport');
const passportConfig = require('./passport');

const userRouter = require('./routes/user');
const requestRouter = require('./routes/request');
const requestsRouter = require('./routes/requests');
const adminRouter = require('./routes/admin');
const extractRouter = require('./routes/extract');
const testRouter = require('./routes/test');
const videoRouter = require('./routes/video');
const externalApiRouter = require('./routes/externalapi');

const app = express();
dotenv.config();

// force = true 테이블을 전부 날림.
// alert = true 테이블의 변경사항을 보고 유지하면서 바꿈. (그래도 위험.)
db.mainDB.sync({ force: false })
    .then(() => {
        console.log('======================= [mainDB] 연결 =======================');
    })
    .catch((err) => {
        console.log(err);
    });
db.company_log.sync({ force: false })
    .then(() => {
        console.log('==================== [company_log] 연결 ====================');
    })
    .catch((err) => {
        console.log(err);
    });

passportConfig();

const whitelist = ["https://dmtlabs.kr", "https://www.dmtlabs.kr", "http://dmtlabs.kr", "http://www.dmtlabs.kr"]

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
        //credentials: true,
    }));
} else {
    // express middleware parsing code
    // morgan => request를 console에 찍어줌.
    app.use(morgan('dev'));
    // cors => 해당 주소에 대한 액세스 허용
    app.use(cors({
        origin: 'http://localhost:3080',
        //credentials: true, // 로그인 세션때문에 true 설정
    }));
}

app.use('/', express.static('uploads'));
app.use(express.json({
    limit: '5mb'
}));
app.use(express.urlencoded({
    limit: '5mb',
    extended: false 
}));

// session => 세션 정의를 위한 미들웨어. secret = cookie 해석에 필요한 키
app.use(session({
    proxy: prod ? true : false,
    resave: false,
    saveUninitialized: false,
    secret: process.env.COOKIE_SECRET,
}));


// passport => 로그인 모듈
// 로그인, 로그아웃 (reqeust response조작 ex. req.login / req.logout)
app.use(passport.initialize());

// 사용자 세션
// app.use(passport.session());

// 라우터
app.use('/user', userRouter);
app.use('/request', requestRouter);
app.use('/requests', requestsRouter);
app.use('/admin', adminRouter);
app.use('/extract', extractRouter);
app.use('/test', testRouter);
app.use('/video', videoRouter);
app.use('/api', externalApiRouter);

app.get('/', (req, res) => {
    return res.status(200).send('[DMTlabs] Web Translate Service Backend');
});

// http = 80 포트
// https = 443 포트
// localhost = 3085 포트
app.listen(prod ? process.env.PORT : 3085, () => {
    console.log(`백엔드 서버 ${prod ? process.env.PORT : 3085}번 포트에서 작동 중.`);
});