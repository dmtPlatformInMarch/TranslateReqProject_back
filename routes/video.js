const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const axios = require('axios');

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

const msToString = (time) => {
    if (time === 0) {
        return "00:00.000";
    } else {
        const min = (time / 60000) >= 1 ? parseInt(time/60000) : 0;
        const sec = min >= 1 ? (time % 60000 / 0.6 / 1000) >= 1 ? parseInt((time % 60000) / 0.6 / 1000) : 0 : (time / 1000) >= 1 ? parseInt(time / 1000) : 0;
        const mill = min >= 1 ? parseInt((time % 60000) / 0.6 % 100) : (time / 1000) >= 1 ? time % 1000 : time;
        const ooMin = (min / 10) >= 1 ? min : `0${min}`;
        const ooSec = (sec / 10) >= 1 ? sec : `0${sec}`;
        const oooMill = (mill / 100) >= 1 ? mill : (mill / 10) >= 1 ? `0${mill}` : `00${mill}`;
        return `${ooMin}:${ooSec}.${oooMill}`;
    }
}

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
            return res.status(200).send('파일 삭제');
        });
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

router.get('/track/:filename', async (req, res, next) => {
    try {
        let timeStamp = [];
        let track = [];

        await s3.getObject({
            Bucket: process.env.S3_BUCKET,
            Key: `tracks/${req.params.filename}.vtt`
        }, (err, data) => {
            if (err) console.log(err);

            const body = new Buffer.from(data.Body).toString('utf8');
            if(body.toString().indexOf('WEBVTT') === -1) {
                res.send('vtt파일을 찾을 수 없거나, 형식이 알맞지 않습니다.');
            }

            // 트랙을 시간과 대사 배열로 저장.
            // 여러 줄인 경우 줄바꿈 문자를 통한 하나의 인덱스에 저장.
            const tracks = body.toString().substring(body.toString().search(/(\d\d:\d\d.\d\d\d) --> (\d\d:\d\d.\d\d\d)/gm)).split('\n');
            for (let [index, str] of tracks.entries()) {
                if (/(\d\d:\d\d.\d\d\d) --> (\d\d:\d\d.\d\d\d)/gm.test(str)) {
                    // 시간인 경우
                    const start = str.substring(0, str.indexOf('-')).trim();
                    const end = str.substring(str.lastIndexOf('>') + 1).trim();
                    timeStamp.push({ "start": start, "end": end });
                } else {
                    if (str === '') continue
                    else {
                        if (tracks[index-1].match(/(\d\d:\d\d.\d\d\d) --> (\d\d:\d\d.\d\d\d)/gm)) {
                            // 한줄 대사
                            track.push(str);
                        } else {
                            // 여러줄 대사
                            let temp = track.pop();
                            track.push(temp.concat(`\n${str}`));
                        }
                    }
                }
            }

            // JSON 파싱
            let trackToJson = [];
            for (let [index] of timeStamp.entries()) {
                trackToJson.push({
                    "start": timeStamp[index].start,
                    "end": timeStamp[index].end,
                    "text": track[index]
                });
            }

            res.status(200).json({ "segment": trackToJson });
        });
    } catch (error) {
        next(error);
    }
});

router.post('/recognition', async (req, res, next) => {
    let trackString = "WEBVTT\n\n";
    try {
        //console.log("받은 파일 URL : ", req.body.fileURL);
        const naverResponse = await axios.post(`${process.env.NAVER_INVOKE_URL}/recognizer/url`, {
            "url": req.body.fileURL,
            "language": "enko",
            "completion": 'sync',
            "diarization.enable": 'false',
            "resultToObs": 'false'
        }, {
            headers: {
                "X-CLOVASPEECH-API-KEY": `${process.env.NAVER_SECRET_KEY}`,
                "Content-Type": "application/json"
            }
        });
        if (naverResponse.data.message === "Succeeded") {
            const segments = naverResponse.data.segments;
            for (const [index, segment] of segments.entries()) {
                const startTime = msToString(segment.start);
                const endTime = msToString(segment.end);
                trackString += `${startTime} --> ${endTime}\n${segment.text}\n\n`;
            }
            
            res.status(200).send(trackString);
        } else {
            res.status(301).json({
                "message": "파일 인식 실패",
                "timeStamp": [],
                "trackURL" : ""
            });
        }
    } catch (error) {
        next(error);
    }
});

module.exports = router;