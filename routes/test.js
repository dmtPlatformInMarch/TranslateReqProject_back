const express = require('express');
const multer = require('multer');
const iconvLite = require('iconv-lite');
const pdfjsLib = require('pdfjs-dist/build/pdf');
const WordExtractor = require('word-extractor');
const AWS = require('aws-sdk');
const { assert } = require('pdfjs-dist/build/pdf.worker');
const speech = require('@google-cloud/speech');
const fs = require('fs');
const stream = require('stream');
const { Readable } = require('stream');
const puppeteer = require('puppeteer');
const ytdl = require('ytdl-core');
const { urlencoded } = require('express');

const router = express.Router();

// pdfParser 준비
const getPdfText = async (data) => {
    let line = 0;
    let finalString = "";
    let doc = await pdfjsLib.getDocument({data}).promise;
    let pageTexts = Array.from({length: doc.numPages}, async (v, i) => {
        // arr은 각 토큰 객체를 담은 객체 배열
        let arr = (await (await doc.getPage(i+1)).getTextContent()).items;
        // map을 통해 객체의 str = text 정보만 가진 배열로 다시 만듬.
        return arr.map(token => {
            // 구문 분석기
            finalString = "";
            if (line != token.transform[5]) {
                if (line != 0) {
                    finalString += '\r\n';
                }
                line = token.transform[5];
            }
            finalString += token.str;
            return finalString;
        }).join(""); // join을 통해 문자열로 재생성
    });
    return (await Promise.all(pageTexts)).join("");
}

// wordParser 준비
const wordExtractor = new WordExtractor();

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
                    const parsing = getPdfText(bufferArray).then(
                        (result) => {
                            res.status(200).send(result);
                        }
                    );
                });
                break;
            case 'docx':
            case 'doc':
                await s3.getObject({
                    Bucket: process.env.S3_BUCKET,
                    Key: `original/${req.params.filename}`
                }, (err, data) => {
                    if (err) console.log(err);
                    //console.log(data?.Body);
                    // const bufferArray = new Uint8Array(data.Body);
                    // docx 파싱 내용 작성
                    const extracted = wordExtractor.extract(data?.Body);
                    extracted.then((result) => {
                        res.status(200).send(result.getBody());
                    });
                });
                break;
            default:
                res.send('잘못된 확장자입니다.');
        }
    } catch (error) {
        next(error);
    }
});

router.post('/googleTest', async (req, res, next) => {
    try {
        const client = new speech.SpeechClient();

        const filename = './uploads/test.weba';
        const encoding = "WEBM_OPUS";
        const sampleRateHertz = 48000;
        const languageCode = "en-US";

        /*const config = {
            encoding: encoding,
            sampleRateHertz: sampleRateHertz,
            languageCode: languageCode,
            audioChannelCount: 2
        };

        const audio = {
            content: fs.readFileSync(filename).toString('base64'),
        };
        
        const request = {
            config: config,
            audio: audio,
        };
        
        // Detects speech in the audio file
        const [response] = await client.recognize(request);
        const transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');
        console.log('Transcription: ', transcription);
        
        return res.status(200).send(transcription);*/
        
        const request = {
            config: {
                encoding: encoding,
                sampleRateHertz: sampleRateHertz,
                languageCode: languageCode,
            },
            interimResults: false,
        };

        const recognizeStream = client
            .streamingRecognize(request)
            .on('error', console.error)
            .on('data', data => {
                console.log(
                    `Transcription: ${data.results[0].alternatives[0].transcript}`
                );
            })
            .on('end', () => {
                return res.status(200).send("백엔드 작업 완료");
            })
        
        fs.createReadStream(filename).pipe(recognizeStream);
    } catch (err) {
        console.log(err);
        next(err);
        return res.status(500).send("recognize error");
    }
});

router.post('/blobSending', upload.single('fileKey'), async (req, res, next) => {
    try {
        const client = new speech.SpeechClient();

        const encoding = "WEBM_OPUS";
        const sampleRateHertz = 48000;
        const languageCode = "en-US";

        const config = {
            encoding: encoding,
            sampleRateHertz: sampleRateHertz,
            languageCode: languageCode,
            audioChannelCount: 2,
        };

        const audio = {
            content: req.file.buffer.toString('base64'),
        };
        
        const request = {
            config: config,
            audio: audio,
            interimResults: true,
        };
        /*
            // Detects speech in the audio file
            const [response] = await client.recognize(request);
            const transcription = response.results
                .map(result => result.alternatives[0].transcript)
                .join('\n');
            //console.log('Transcription: ', transcription);
        */
        const recognizeStream = client
            .streamingRecognize(request)
            .on('error', console.error)
            .on('data', data => {
                console.log(
                    `flag: ${JSON.stringify(data.results[0].isFinal)}\nTranscription: ${JSON.stringify(data.results[0].alternatives[0])}`
                );
                transcription = data.results[0].alternatives[0].transcript;
                final = data.results[0].isFinal;
            })
            .on('end', () => {
                return res.status(200).send({
                    flag: final,
                    text: transcription 
                });
            })

        let transcription = "";
        let final = true;
        const bufferStream = new stream.PassThrough(); //Readable.from(req.file.buffer);
        bufferStream.end(req.file.buffer);
        bufferStream.pipe(recognizeStream);
        //return res.status(200).send({ text: transcription });
    } catch (err) {
        next(err);
    }
});

function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time);
    });
}

router.get('/download', async (req, res, next) => {
    try {
        const info = await ytdl.getInfo(req.query.youtubeURL);
        const filename = encodeURI(info.videoDetails.title);
        const contentHeader = `attachment; filename*=UTF-8''${filename}.mp4`;
        res.setHeader("Content-Disposition", contentHeader);
        ytdl(req.query.youtubeURL).pipe(res);
    } catch (err) {
        console.log(err);
        next();
    }
});

module.exports = router;