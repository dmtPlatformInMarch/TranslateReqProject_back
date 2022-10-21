const express = require('express');
const AWS = require('aws-sdk');
const iconvLite = require('iconv-lite');
const axios = require('axios');
const fs = require('fs');
const spawn = require('child_process').spawn;
const { vaildToken } = require('./middlewares');
const bcrypt = require('bcrypt');

const db = require('../models')['mainDB'];
const router = express.Router();

router.get('/', vaildToken, (req, res, next) => {
    return res.send("api is ready!!!");
});

router.post('/check-token', vaildToken, async (req, res, next) => {
    try {
        const tokenEff = await db.Companys.findOne({
            where: {
                organization: req.body.organization,
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
        // 로그 기록
        const dirOrganization = findOrganization.organization.replace(/ /g, "_");
        !fs.existsSync('../api_log')&&fs.mkdirSync('../api_log');
        !fs.existsSync(`../api_log/${dirOrganization}`)&&fs.mkdirSync(`../api_log/${dirOrganization}`);
        const response = await axios.post('https://dmtcloud.kr/translate-text', {
            from: req.body.from,
            to: req.body.to,
            text: req.body.text
        });

        if (response.status === 200) {
            let logData = `STATE : SUCCESS\nCHARACTER : ${req.body.text.length}\nDATE : ${new Date().toString()}\n\n`;

            fs.appendFile(`../api_log/${dirOrganization}/text_log.txt`, logData, err => {
                if (err) {
                    console.log(err);
                    return;
                }
            });
            db.Companys.update({
                usage: findOrganization.usage + req.body.text.length
            }, {
                where: {
                    organization: findOrganization.organization
                }
            });

            return res.status(200).json({
                to: req.body.to,
                text: response.data[0].translations
            });
        } else {
            let logData = `STATE : ERROR\nDATE : ${new Date().toString()}\nERROR : translator error\n\n`;

            fs.appendFile(`../api_log/${dirOrganization}/text_log.txt`, logData, err => {
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

        fs.appendFile(`../api_log/${dirOrganization}/text_log.txt`, logData, err => {
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

/*
*   updateUsage.sh 의 파일 경로가
*   해당 명령줄의 파라미터임.
*   = 그 회사 파일의 text_log.txt에 로깅을 함.
*   
*   파일 경로가 상대 위치이기에 DMT_back 폴더에서 실행 기준이므로
*   API 호출 시 ../ 경로에 있는 api_log 폴더를 찾아야 함.
*   -> 그냥 update.sh 실행시 경로가 맞지 않아서 오류.
*   
*   회사 폴더, 모두 업데이트를 해줘야 함.
*   api_log의 모든 회사 디렉토리를 순회하며 update해야 함.
*   -> 회사 디렉토리를 순회하며 updateUsage.sh "회사" 를 실행하는 쉘 파일 제작
*/
router.get('/shell', (req, res, next) => {
    try {
        let task = spawn(`sh`, ['../updateUsage.sh', `${decodeURI(req.query.organization).replace(/ /g, "_")}`]);
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