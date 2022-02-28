const express = require('express');
const multer = require('multer');
const path = require('path');
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');

const db = require('../models');
const { isLoggedIn } = require('./middlewares');

const router = express.Router();

// 아마존 연결
AWS.config.update({
  region: 'ap-northeast-2',
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
});

// AWS S3 설정
const upload = multer({
  // 임시스토리지 -> 나중에 교체
  storage: multerS3({
    s3: new AWS.S3(),
    bucket: 'dmtlabs-files',
    key(req, file, cb) {
      cb(null, `original/${Date.now()}${path.basename(file.originalname)}`);
    },
  }),
  limit: { fileSize: 20 * 1024 * 1024 }, // 20MB (byte단위)
});

// 의뢰 수정
router.patch('/:id', async (req, res, next) => {
  try {
    // 이곳에 수정내용 작성
  } catch (err) {
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
      },
    });
    return res.send('삭제');
  } catch (err) {
    console.error(err);
    next(err);
  }
});

// 번역 파일 업로드
router.post('/file', isLoggedIn, upload.array('fileKey'), (req, res) => {
  console.log(req.files);
  return res.json(req.files.map((v) => decodeURI(v.location)));
});

// 번역 의뢰
// router 시행 전에는 deSerialUser가 시행된다.
router.post('/', isLoggedIn, async (req, res, next) => {
  try {
    const newRequest = await db.Requests.create({
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email,
      company: req.body.company,
      second_phone: req.body.second_phone,
      date: req.body.date,
      options: req.body.options,
      trans_state: req.body.trans_state,
      UserId: req.user.id,
    });
    const files = await Promise.all(
      req.body.file.map((file, i) => {
        Array.from(file).forEach((f) => {
          db.Files.create({
            chainNumber: i,
            src: f,
            UserId: req.user.id,
            req_lang: req.body.req_lang[i],
            grant_lang: req.body.grant_lang[i],
            field: req.body.field[i],
            RequestId: newRequest.id
          });
        });
      })
    );
    const fullRequest = await db.Requests.findOne({
      where: { id: newRequest.id },
      /*include: [{
        model: db.Files,
        attributes: ['src', 'req_lang', 'grant_lang'],
      }],*/
    });
    return res.json(fullRequest);
  } catch (err) {
    console.error(err);
    next(err);
  }
});

module.exports = router;
