const express = require('express');
const AWS = require('aws-sdk');
const iconvLite = require('iconv-lite');
const axios = require('axios');
const fs = require('fs');
const spawn = require('child_process').spawn;
const { vaildToken } = require('./middlewares');

const db = require('../models');
const router = express.Router();

router.get('/', vaildToken, (req, res, next) => {
    return res.send("api is ready!!!");
});

router.get('/check-token', vaildToken, async (req, res, next) => {
    try {
        const tokenEff = await db.Companys.findOne({
            where: {
                organization: req.headers.organization,
                token: req.headers.token 
            }
        });
        
        if (tokenEff === null) {
            return res.json({
                code: 401,
                status: "ERROR",
                message: "This Token is not vaild."
            });
        }

        return res.json({
            code: 200,
            status: "SUCCESS",
            message: "This Token is valid."
        });
    } catch (err) {

    }
});

/*
    request header
    {
        toekn: 발급 토큰
    }
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

*******************************************************
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
router.post('/translate-text', vaildToken, async (req, res, next) => {
    if (req.headers.token === undefined) {
        return res.json({
            code: 403,
            error: 'Empty Token in Headers'
        });
    }
    try {
        const findOrganization = await db.Companys.findOne({
            where: { token: req.headers.token }
        });
        if (findOrganization === null) {
            return res.json({
                code: 404,
                error: "Not found Token"
            });
        }
        console.log();
        // 로그 기록
        !fs.existsSync('../api_log')&&fs.mkdirSync('../api_log');
        !fs.existsSync(`../api_log/${findOrganization.organization}`)&&fs.mkdirSync(`../api_log/${findOrganization.organization}`);
        const response = await axios.post('https://dmtcloud.kr/translate-text', {
            from: req.body.from,
            to: req.body.to,
            text: req.body.text
        });

        if (response.status === 200) {
            let logData = `STATE : SUCCESS\nCHARACTER : ${req.body.text.length}\nDATE : ${new Date().toString()}\n\n`;

            fs.appendFile(`../api_log/${findOrganization.organization}/text_log.txt`, logData, err => {
                if (err) {
                    console.log(err);
                    return;
                }
            });

            return res.status(200).json({
                to: req.body.to,
                text: response.data[0].translations
            });
        } else {
            let logData = `STATE : ERROR\nDATE : ${new Date().toString()}\nERROR : translator error\n\n`;

            fs.appendFile(`../api_log/${findOrganization.organization}/text_log.txt`, logData, err => {
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

        fs.appendFile(`../api_log/${findOrganization.organization}/text_log.txt`, logData, err => {
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
        let task = spawn('../updateUsage.sh');
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
        console.log(err);
        next(err);
    }
});

module.exports = router;