const express = require('express');
const AWS = require('aws-sdk');
const iconvLite = require('iconv-lite');
const axios = require('axios');
const fs = require('fs');
const spawn = require('child_process').spawn;

const db = require('../models');
const router = express.Router();
/*
    request Body
    {
        from : 원본 언어,
        to : 번역할 언어,
        text : 번역할 텍스트
    }

    response ***배열로 되어 있음. response[0]로 참조
    [
        {
            to : 번역된 언어 (request로 받은 to),
            translations: 번역된 텍스트
        },
    ]
*/
router.get('/', (req, res) => {
    return res.send("api is ready!!!");
});

/*
*   [log 기록 형식]
*   
*   - api 정상 응답 -
*   STATE : SUCCESS
*   CHARACTER : (translate text length)
*   DATE : (API calling Date)
*   
*   - api 에러 응답 -
*   STATE : ERROR
*   DATE : (API calling Date)
*   ERROR : ['translator error', 'api error']
* 
*/
router.post('/translate-text', async (req, res, next) => {
    try {
        // 로그 기록
        !fs.existsSync('../api_log')&&fs.mkdirSync('../api_log');
        !fs.existsSync('../api_log/company')&&fs.mkdirSync('../api_log/company');
        const response = await axios.post('https://dmtcloud.kr/translate-text', {
            from: req.body.from,
            to: req.body.to,
            text: req.body.text
        });

        if (response.status === 200) {
            let logData = `STATE : SUCCESS\nCHARACTER : ${req.body.text.length}\nDATE : ${new Date().toString()}\n\n`;

            fs.appendFile('../api_log/company/log.txt', logData, err => {
                if (err) {
                    console.log(err);
                    return;
                }
            });

            return res.status(200).send({
                text: response.data[0].translations
            });
        } else {
            let logData = `STATE : ERROR\nDATE : ${new Date().toString()}\nERROR : translator error\n\n`;

            fs.appendFile('../api_log/company/log.txt', logData, err => {
                if (err) {
                    console.log(err);
                    return;
                }
            });

            console.log("Translator Error");
            next(err);
            return res.status(402).send("Translator Error");
        }
    } catch (err) {
        let logData = `STATE : ERROR\nDATE : ${new Date().toString()}\nERROR : api error\n\n`;

        fs.appendFile('../api_log/company/log.txt', logData, err => {
            if (err) {
                console.log(err);
                return;
            }
        });

        console.log("API Error");
        next(err);
        return res.status(401).send("API Error");
    }
});

router.get('/shell', (req, res, next) => {
    try {
        console.log(process.env.PATH);
        let task = spawn('/home/updateUsage.sh');
        let result = "";

        task.stdout.on('data', function (data) {
            result = data.toString()
        });
        task.stderr.on('data', function (data) {
            console.log('stderr: ', data.toString());
            result = data.toString();
        })
        task.on('exit', (code) => {
            console.log('child process exited with code', code.toString());
            return res.status(200).json({
                code: 200,
                result: result
            });
        })
    } catch (err) {

    }
});

module.exports = router;