const express = require('express');
const multer = require('multer');
const path = require('path');

const db = require('../models');

const { isLoggedIn } = require('./middlewares');

const router = express.Router();

const upload = multer({
    // 임시스토리지 -> 나중에 교체
    storage: multer.diskStorage({
        destination(req, file, done){
            // 저장장소
            done(null, 'uploads');
        },
        filename(req, file, done){
            // 파일이름양식
            const ext = path.extname(file.originalname); // 확장자
            const basename = path.basename(file.originalname, ext); // 이름
            done(null, basename + Date.now() + ext);
        },
    }),
    limit: { fileSize: 20 * 1024 * 1024}, // 20MB (byte단위)
});

// 의뢰 수정
router.patch('/:id', async (req, res, next) => {
    try {
        // 이곳에 수정내용 작성
    } catch(err) {
        console.error(err);
        next(err);
    }
});

// 의뢰 삭제
router.delete('/:id', async (req, res, next) => {
    try {
        await db.Requests.destroy({
            where: {
                id: req.params.id,
            }
        })
        req.send('삭제');
    } catch (err) {
        console.error(err);
        next(err);
    }
})

// 해당 의뢰의 번역 정보(Subrequest)들 가져오기
// Subrequest에는 번역 언어 정보가 담겨있음 (req_lang, grant_lang)
router.get('/:id/sub', async (req, res, next) => {
    try {
        const reqstate = await db.Requests.findOne({ where: { id: req.params.id }});
        if (!reqstate) {
            return res.status(404).send('의뢰가 존재하지 않습니다.');
        }
        const subReq = await db.Subrequest.findAll({
            where: {
                RequestId: req.params.id,
            },
            include: {
                model: db.Subrequest,
                attributes: ['req_lang', 'grant_lang'],
            },
            order: [['createdAt', 'ASC']], // 2차원 배열로 정렬해야함.
        });
        res.json(subReq);
    } catch (err) {
        console.error(err);
        next(err);
    }
});

// 번역 파일 업로드
// 의뢰와 파일은 따로 등록을 해야함.
router.post('/file', isLoggedIn, upload.array('fileKey'), (req, res) => {
    console.log(req.files);
    return res.json(req.files.map(v => v.filename));
});

// 번역 의뢰
// router 시행 전에는 deSerialUser가 시행된다.
router.post('/', isLoggedIn, async (req, res, next) => {
    try {
        const newRequest = await db.Requests.create({
            id: req.body.id,
            name: req.body.name,
            phone: req.body.phone,
            email: req.body.email,
            company: req.body.company,
            second_phone: req.body.second_phone,
            date: req.body.date,
            options: req.body.options,
            trans_state: req.body.trans_state,
            UserId: req.user.id
        });
        for (let i = 0; i < 5; i++) {
            if (req.body.req_lang != '' && req.body.grant_lang != '') {
                const newSubquest = await db.Subrequest.create({
                    req_lang: req.body.req_lang[i],
                    grant_lang: req.body.grant_lang[i],
                    RequestId: newRequest.id,
                });
            }
            // req에 file이 있는가?
            if (Array.isArray(req.body.file)) {
                // 파일이 여러개인 경우
                const files = await Promise.all(req.body.file.map((file) => {
                    return db.File.create({ src: file, RequestId: newRequest.id });
                }));
            } else {
                // 파일이 하나인 경우
                console.log(req.body.file);
                const files = await db.File.create({ src: req.body.file, RequestId: newRequest.id });
            }
        }
        const fullRequest = await db.Requests.findOne({
            where: { id: newRequest.id },
            include: [{
                model: db.User,
                attributes: ['id', 'nickname'],
            },{
                model: db.Subrequest,
                attributes: ['req_lang','grant_lang'],
            },{
                model: db.File,
            }],
        });
        return res.json(fullRequest);
    } catch (err) {
        console.error(err);
        next(err);
    }
});

module.exports = router;