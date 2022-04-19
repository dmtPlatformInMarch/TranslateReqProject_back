const express = require('express');
const multer = require('multer');
const fileUpload = require('express-fileupload');
const pdfparse = require('pdf-parse');
const path = require('path');
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');

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
router.delete('/:id', isLoggedIn, async (req, res, next) => {
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
router.post('/file', isLoggedIn, upload.array('fileKey'), async (req, res, next) => {
  return res.json(req.files.map((v) => decodeURI(v.location)));
});

// pdf 파일 분석
router.post('/extract/pdf', fileUpload(), (req, res, next) => {
  let count = 0;
  let str = '';
  if (!req.files) {
    // change 이벤트 리스너 동작
    // 값이 비는 것도 바뀌는 것으로 인식해서 요청 보냄
    res.status(300);
    res.end();
  } else {
    pdfparse(req.files.fileKey).then(result => {
      if (req.body.lang === '중국어(간체)' || req.body.lang === '중국어(번체)' || req.body.lang === '일본어') {
        // 글자 단위 처리
        str = result.text;
        str.replace(/\n/g, "");
        str.replace(/\s*/g, "");
        for (let i = 0; i < str.length; i++) {
          if (/[一-龥ぁ-ゔァ-ヴー々〆〤]/.test(str[i])) {
            count++;
          }
        }
        res.json({ 'count': count });
        res.end();
      } else {
        // 공백 단위 처리
        str = result.text;
        let splitList = str.split(/\s+/);
        count = splitList.length;
        res.json({ 'count': count - 1 });
        res.end();
      }
    });
  }
});

// txt 파일 분석
router.post('/extract/txt', fileUpload(), (req, res, next) => {
  let count = 0;
  let str = '';

  if (!req.files) {
    // change 이벤트 리스너 동작
    // 값이 비는 것도 바뀌는 것으로 인식해서 요청 보냄
    res.status(300);
    res.end();
  } else {
    str = req.files.fileKey.data.toString('utf-8');
    if (req.body.lang === '중국어(간체)' || req.body.lang === '중국어(번체)' || req.body.lang === '일본어') {
      // 글자 단위 처리
      str.replace(/\n/g, "");
      str.replace(/\s*/g, "");
      for (let i = 0; i < str.length; i++) {
        if (/[一-龥ぁ-ゔァ-ヴー々〆〤]/.test(str[i])) {
          count++;
        }
      }
      res.json({ 'count': count });
      res.end();
    } else {
      // 공백 단위 처리
      let splitList = str.split(/\s+/);
      count = splitList.length;
      res.json({ 'count': count });
      res.end();
    }
  }
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
          }).then((data) => {
            db.Fileinfos.create({
              file_type: req.body.fileInfo[i].ext,
              words: req.body.fileInfo[i].words,
              cost: req.body.fileInfo[i].cost,
              FileId: data.id,
            });
          }).catch((err) => {
            console.log('error File create', err);
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
