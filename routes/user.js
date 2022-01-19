const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('passport');
const db = require('../models');

const router = express.Router();

router.post('/');


// 회원가입
router.post('/', async (req, res, next) => {
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
        return res.status(201).json(newUser);
    } catch (err) {
        console.log(err);
        return next(err);
    }
});

// 로그인
// 쿠키 정보는 connect.sid란 이름으로 req.login이 알아서 내려줌.
router.post('/login', (req, res, next) => {
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

// 로그아웃
router.post('/logout', (req, res) => {
    if(req.isAuthenticated()){
        req.logout();
        // 세션 지우기는 선택
        req.session.destroy();
        return res.status(200).send('로그아웃 되었습니다.');
    }
});

module.exports = router;

