const express = require('express');
const multer = require('multer');
const path = require('path');
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');
const fs = require('fs');
const pdf = require('pdf-parse');

const db = require('../models');
const { isLoggedIn } = require('./middlewares');

const router = express.Router();

const s3 = new AWS.S3({
  region: 'ap-northeast-2',
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
});

// AWS S3 설정
const upload = multer({
  // 임시스토리지 -> 나중에 교체
  storage: multerS3({
    s3: s3,
    bucket: 'dmtlabs-files',
    contentDisposition(req, file, cb) {
      cb(null, `attachment; filename=${encodeURI(file.originalname)}`);
    },
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
// 2022.03.11 확인
router.post('/file', isLoggedIn, upload.array('fileKey'), (req, res) => {
  /*const files = Array.from(req.files);
  if (files && files.length === 1) {
    if (files[0].mimetype === 'application/pdf') {
      // 파일 path or instance of Buffer or URL이 들어가야함.
      let dataBuffer = fs.readFileSync(files[0]);
      console.log(`${files[0].mimetype}이 pdf이고, dataBuffer가 \n${dataBuffer}`);
      pdf(dataBuffer).then((data) => {
        // number of pages
        console.log(data.numpages);
        // number of rendered pages
        console.log(data.numrender);
        // PDF info
        console.log(data.info);
        // PDF metadata
        console.log(data.metadata);
        // PDF.js version
        console.log(data.version);
        // PDF text
        console.log(data.text);
      })
    } else {

    }
  } else {

  }*/
  return res.json(req.files.map((v) => decodeURI(v.location)));
});

// 번역 파일 삭제
router.delete('/file/delete', isLoggedIn, async (req, res, next) => {
  try {
    if (req.body.files.length === 1) {
      // 단일 파일의 경우
      const deleteResponse = await s3.deleteObjects({
        Bucket: 'dmtlabs-files',
        Delete: {
          Objects: [{ Key: `original/${req.body.files[0].toString().substring(req.body.files[0].toString().lastIndexOf("/") + 1)}` }],
          Quiet: false
        },
      }, (err, data) => {
        if (err) { console.log(err); }
        console.log('s3 deleteObject ', data);
      });
      return res.status(201).send('단일 파일 삭제');
    } else {
      // 다중 파일의 경우
      const deleteResponse = await Array.from(req.body.files).forEach((f) => {
        console.log(`original/${f.toString().substring(req.body.files[0].toString().lastIndexOf("/") + 1)}`);
        s3.deleteObjects({
          Bucket: 'dmtlabs-files',
          Delete: {
            Objects: [{ Key: `original/${f.toString().substring(req.body.files[0].toString().lastIndexOf("/") + 1)}` }],
            Quiet: false
          },
        }, (err, data) => {
          if (err) { console.log(err); }
          console.log('s3 deleteObject ', data);
        });
      });
      return res.status(201).send('다중 파일 삭제');
    }

  } catch (err) {
    console.log(err);
    next(err);
  }
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
