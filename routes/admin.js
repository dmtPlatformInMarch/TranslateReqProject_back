const express = require('express');
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');

const db = require('../models');

const router = express.Router();

// 아마존 S3 스토어 연결
const s3 = new AWS.S3({
    region: 'ap-northeast-2',
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
});

// 의뢰 취소 (삭제)
router.delete('/request/:id', async (req, res, next) => {
    try {
        await db.Requests.destroy({
            where: {
                id: req.params.id,
            },
        });
        return res.send('삭제');
    } catch (err) {
        console.log(err);
        next(err);
    }
});

// 의뢰 목록 반환
router.get('/requests', async (req, res, next) => {
    try {
        const allRequests = await db.Requests.findAll({
            include: [{
                model: db.Files,
                attributes: ['chainNumber', 'src', 'req_lang', 'grant_lang', 'field'],
            }, {
                model: db.Users,
                attributes: ['nickname', 'email'],
            }],
            order: [['id', 'DESC']],
        });
        return res.json(allRequests);
    } catch (err) {
        console.log(err);
        next(err);
    }
});

// 유저 목록 반환
router.get('/users', async (req, res, next) => {
    try {
        const userRequests = await db.Users.findAll({
            where: { permission: 'user' },
            attributes: ['nickname', 'email', 'permission', 'createdAt'],
            order: [['id', 'DESC']],
        });
        return res.json(userRequests);
    } catch (err) {
        console.log(err);
        next(err);
    }
});

// 의뢰 파일 조회
// 추가 구현 필요
router.get('/file/:id', async (req, res, next) => {
    try {
        const fileRequests = await db.Files.findOne({
            where: { id: req.params.id },
        });
        res.json(fileRequests);
    } catch (err) {
        console.log(err);
        next(err);
    }
});

// 의뢰 파일 다운로드
router.get('/file/:filename', async (req, res, next) => {
    try {
        // 파일 다운로드 로직 작성

        return res.status(200).send('파일다운 api 미구현');
    } catch (err) {
        console.log(err);
        next(err);
    }
});

// 유저 삭제(탈퇴)
router.delete('/user/delete/:email', async (req, res, next) => {
    try {
        await db.Users.destroy({
            where: {
                email: req.params.email,
            }
        })
        return res.send('유저 강제 탈퇴');
    } catch (err) {
        console.log(err);
        next(err);
    }
});

module.exports = router;