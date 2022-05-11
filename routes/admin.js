const express = require('express');
const AWS = require('aws-sdk');
const iconvLite = require('iconv-lite');

const db = require('../models');
const router = express.Router();

// 아마존 S3 스토어 연결
const s3 = new AWS.S3({
    region: 'ap-northeast-2',
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
});

// 의뢰 취소 (삭제)
router.delete('/request/delete/:id', async (req, res, next) => {
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
router.get('/file/get/:id', async (req, res, next) => {
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
router.get('/file/download/:filename', async (req, res, next) => {
    try {
        // 파일명 브라우저별 인코딩
        const fn = () => {
            if (req.headers['user-agent'].includes("MSIE") || req.headers['user-agent'].includes("Trident")) {
                return encodeURIComponent(req.params.filename).replace(/\\+/gi, "%20");
            } else if (req.headers['user-agent'].includes("Chrome")) {
                return iconvLite.encode(req.params.filename, "UTF-8");
            } else if (req.headers['user-agent'].includes("Opera")) {
                return iconvLite.decode(iconvLite.encode(req.params.filename, "UTF-8"), 'ISO-8859-1');
            } else if (req.headers['user-agent'].includes("Firefox")) {
                return iconvLite.decode(iconvLite.encode(req.params.filename, "UTF-8"), 'ISO-8859-1');
            }
            return req.params.filename;
        }

        res.attachment(fn().toString()); // 헤더에 Content-Disposition : attachment; filename = fn()을 연결 => 다운로드함으로 인식
        const downloadS3 = await s3.getObject({
            Bucket: 'dmtlabs-files',
            Key: 'original/' + fn()
        }).createReadStream();
        downloadS3.pipe(res);
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
        });
        return res.send('유저 강제 탈퇴');
    } catch (err) {
        console.log(err);
        next(err);
    }
});

router.post('/stateSet', async (req, res, next) => {
    await db.Requests.update(
        {
            trans_state: req.body.state
        },
        {
            where: { id: req.body.request.id }
        }
    );
    return res.send('번역 상태 변경');
});

module.exports = router;