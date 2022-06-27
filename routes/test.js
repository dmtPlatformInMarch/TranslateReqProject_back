const express = require('express');
const multer = require('multer');
const iconvLite = require('iconv-lite');

const AWS = require('aws-sdk');

const router = express.Router();

// pdfParser 준비


// multer 미들웨어 파싱 (비 저장)
// MemoryStorage 사용 예상
const upload = multer();

// 아마존 S3 스토어 연결
const s3 = new AWS.S3({
    region: 'ap-northeast-2',
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
});

router.get('/', (req, res) => {
    return res.status(200).send('연결 안정적');
});

router.post('/presigned', upload.single('fileKey'), async (req, res, next) => {
    const params = {
        Bucket: process.env.S3_BUCKET,
        Key: 'original/' + req.file.originalname,
        Expires: 60 * 3,
    }
    try {
        //console.log(req.file);
        const signedUrlPut = await s3.getSignedUrlPromise("putObject", params);
        return res.send(signedUrlPut);
    } catch (error) {
        next(error);
    }
});

router.get('/file/download/:filename', async (req, res, next) => {
    try {
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
        
        res.attachment(fn().toString());
        const downloadS3 = await s3.getObject({
            Bucket: process.env.S3_BUCKET,
            Key: 'original/' + fn()
        }).createReadStream();
        downloadS3.pipe(res);
    } catch (error) {
        next(error);
    }
});

router.delete('/file/delete/:filename', async (req, res, next) => {
    try {
        const deleteRes = await s3.deleteObjects({
            Bucket: process.env.S3_BUCKET,
            Delete: {
                Objects: [{ 
                    Key: `original/${req.params.filename}`
                }],
                Quiet: false
            },
        }, (err, data) => {
            if (err) { console.log(err); }
            console.log('s3 deleteObject ', data);
        });
        return res.status(200).send('파일 삭제');
    } catch (error) {
        next(error);
    }
});

router.get('/file/extract/:filename', async (req, res, next) => {
    try {
        const ext = req.params.filename.substring(req.params.filename.lastIndexOf(".") + 1);
        switch(ext) {
            case 'txt':
                await s3.getObject({
                    Bucket: process.env.S3_BUCKET,
                    Key: `original/${req.params.filename}`
                }, (err, data) => {
                    if (err) console.log(err);
                    const body = new Buffer.from(data.Body).toString('utf8');
                    res.send(body);
                });
                break;
            case 'pdf':
                await s3.getObject({
                    Bucket: process.env.S3_BUCKET,
                    Key: `original/${req.params.filename}`
                }, (err, data) => {
                    if (err) console.log(err);
                    const bufferArray = new Uint8Array(data.Body);
                    // pdf 파싱 내용 작성
                    function(err) {
                        console.log(err);
                    });
                    res.send("pdf 파싱 테스트 중");
                });
                break;
            default:
                res.send('잘못된 확장자입니다.');
        }
    } catch (error) {
        next(error);
    }
});

module.exports = router;