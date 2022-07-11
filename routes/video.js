const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');

const router = express.Router();

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
        Key: 'videoes/' + req.file.originalname,
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

router.delete('/file/delete/:filename', async (req, res, next) => {
    try {
        const deleteRes = await s3.deleteObjects({
            Bucket: process.env.S3_BUCKET,
            Delete: {
                Objects: [{ 
                    Key: `videoes/${req.params.filename}`
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

router.get('/file/list', async (req, res, next) => {
    let objects = [];
    let listResponse;

    try {    
        do {
            listResponse = await s3.listObjectsV2({
                Bucket: process.env.S3_BUCKET,
                Prefix: 'videoes/'
            }).promise();
            objects = objects.concat(listResponse.Contents.slice(1));
            if (listResponse.IsTruncated) {
                params.ContinuationToken = listResponse.NextContinuationToken;
            }
        } while (listResponse.IsTruncated);
        res.status(200).send(objects);
    } catch (error) {
        next(error);
    }
});

module.exports = router;