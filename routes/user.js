const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('passport');
const db = require('../models')['mainDB'];
const jwt = require('jsonwebtoken');

const router = express.Router();

// 유저 정보 전송
router.get('/', passport.authenticate('jwt', {session: false}), async (req, res, next) => {
    const user = await db.Users.findOne({
        where: { 
            accessToken: req.headers.authorization
        }
    });
    console.log("로그인 정보 : ", JSON.stringify({
        'id': user.id, 
        'nickname': user.nickname, 
        'email': user.email, 
        'permission': user.permission,
        'organization': user.organization,
    }));
    return res.json({ 
        'id': user.id, 
        'nickname': user.nickname, 
        'email': user.email, 
        'permission': user.permission,
        'organization': user.organization,
    });
});

// 회원가입
router.post('/signup', async (req, res, next) => {
    try {
        const hash = await bcrypt.hash(req.body.password, 10);
        const exUser = await db.Users.findOne({
            where: {
                email: req.body.email,
            },
        });
        if (exUser) {
            // 회원가입이 된 이메일인가?
            // 403은 액세스 금지 => 대부분 에러를 따로 정의
            return res.status(202).json({
                errorCode: 1,
                message: '이미 회원가입 된 계정입니다.'
            });
        }
        const newUser = await db.Users.create({
            email: req.body.email,
            password: hash,
            nickname: req.body.nickname,
            organization: req.body.organization
        });
        return res.status(201).json("회원가입 성공");
    } catch (err) {
        console.log(err);
        return next(err);
    }
});

// 로그인
// 쿠키 정보는 connect.sid란 이름으로 req.login이 알아서 내려줌.
router.post('/login', async (req, res, next) => {
    passport.authenticate('local', { session: false }, (err, user, info) => {
        // error 발생
        if (err || !user || info) {
            console.log("서버 에러 : ", err, info);
            return res.status(403).json({
                code: 403,
                message: info.reason
            });
        }
        // req.login으로 passport.serializeUser() 실행
        return req.login(user, { session: false }, async (err) => {
            if (err) {
                console.log("로그인 중 오류 발생 : ", err);
                return next(err);
            }
            const token = jwt.sign({
                id: user.id,
                email: user.email,
                nickname: user.nickname,
                organization: user.organization,
                permission: user.permission
            }, process.env.JWT_TOKEN_SECRET);
            // 토큰을 내려줌.
            await db.Users.update({
                accessToken: token
            },
            {
                where: {
                    email: user.email
                },
            });
            return res.json({ token });
        });
    })(req, res, next);
});

// 로그아웃
router.post('/logout', (req, res) => {
    req.logout();
    return res.status(200).send('로그아웃 되었습니다.');
});

module.exports = router;

