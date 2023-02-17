const express = require('express');
const fileUpload = require('express-fileupload');
const AdmZip = require('adm-zip');
const pdfparse = require('pdf-parse');
const StreamZip = require('node-stream-zip');
const { rejects } = require('assert');
const { resolve } = require('path');
const JSZip = require('jszip');
const DOMParser = require('dom-parser');
const AWS = require('aws-sdk');
const axios = require('axios');
const fs = require('fs');
const { type } = require('os');
const FileSaver = require('file-saver');
const { json } = require('stream/consumers');
const http = require('http');
const iconvLite = require('iconv-lite');

const router = express.Router();

router.get('/', (req, res) => {
    return res.status(200).send('연결 안정적');
});

router.post('/docx', fileUpload(), async (req, res, next) => {

    if (!req.files && !req.files.extFile) {
        res.status(400);
        res.end();
    }
    
    const docxFile = req.files.extFile;
    var newFile = new JSZip;
    
    await newFile.loadAsync(docxFile.data).then( async (zip) => {
        await zip.file('word/document.xml').async("string").then(
            async function(stringText) {

                // <w:p> 문단 별로 쪼개기
                var wpPattern = /<w:p(.|\n)*?<\/w:p>/g; // /(?<=\<w:p.)((.|\n)*?)(?=<\/w:p>)/g;
                var wps = stringText.match(wpPattern);
                var wrCnt = [];
                var layout = [];
                
                for (let i = 0; i < wps.length; i++) {
                    // 레이아웃 가져올 때 쓰는 정규식 => 코드 수정시 필요할 수도 있음.
                    // wps[i].match(/<w:r>(.|\n)*?<\/w:r>/g) !== null && 
                    if (wps[i].match(/<w:t(.|\n)*?<\/w:t>/g) !== null) {
                        var m = wps[i].match(/<w:r>(.|\n)*?<\/w:r>/g);
                        wrCnt.push(m.length);
                        layout.push(m[0]);
                    }        
                }

                //console.log(wps);
                // w:t 안에 텍스트들 가져오기
                var wtPattern = /(?<=\<w:t)(.*?)(?=\/w:t>)/g;
                var wtPattern2 = /(?<=\>)(.*?)(?=<)/g;
                var wts = stringText.match(wtPattern);
                var wtsText = [];
                for (let i = 0; i < wts.length; i++) {
                    var wt = wts[i].match(wtPattern2);
                    wtsText.push(wt[0]);
                }
           
                try {
                    // 문단 당 문장
                    var wtIdx = 0;
                    var tranBefore = [];
                    var tranAfter = [];
                    for (let i = 0; i < wrCnt.length; i++) {
                        var sentence = '';
                        for (let j = 0; j < wrCnt[i]; j++) {
                            sentence += wtsText[wtIdx];
                            wtIdx++;
                        }
                        tranBefore.push(sentence);
                        // sentence가 한 문장
                        var res = await axios.post('https://dmtcloud.kr/translate-text', {
                            from: req.body.fromCode,
                            to: req.body.toCode,
                            text: sentence,
                        }, { progress: false });
                        var str = res.data[0].translations
                        tranAfter.push(str.substring(0, str.length-1));
                    }
                } catch(e) {
                    //console.error(e);
                }

                for (let i = 0; i < layout.length; i++) {
                    var tranSen = '';
                    tranSen = ">" + tranAfter[i] + "<";
                    layout[i] = layout[i].replace(wtPattern, tranSen);
                }                       
                
                var ungreedy = /<w:r>(.|\n)*<\/w:r>/g;
                var idx = 0;
                for (let i = 0; i < wps.length; i++) {
                    var para = '';
                    // 레이아웃 가져올 때 필요할 수 있는 정규식
                    //wps[i].match(/<w:r>(.|\n)*?<\/w:r>/g) !== null && 
                    if (wps[i].match(/<w:t(.|\n)*?<\/w:t>/g) !== null) {
                        para = wps[i].replace(ungreedy, layout[idx]);
                        stringText = stringText.replace(wps[i], para);
                        idx++;
                    }
                    
                }
                newFile.file("word/document.xml", stringText);
            }
        );
    })
    const originName = req.body.name;
    const newName = originName.substring(0, originName.length-5) + "(" + req.body.toCode + ").docx";

    const fsdocx = await newFile.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: {
            level: 4
        },
        mimeType: "application/vnd.openxmlformats-officedocumnet.wordprocessingml.document"
    });
    
    res.send(fsdocx);

    const BUCKET_NAME = 'dmtlabs-translate-files';
    const s3 = new AWS.S3({
        region: 'ap-northeast-2',
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    });
    
    const params = {
        Bucket: BUCKET_NAME,
        Key: newName,
        Body: fsdocx
    };

    s3.upload(params, function(err, data) {
        if (err) {throw err;}
        console.log(`File uploaded successfully. ${data.Location}`);
    })

});

router.get('/download/:filename', async (req, res, next) => {
    const BUCKET_NAME = 'dmtlabs-translate-files';
    const s3 = new AWS.S3({
        region: 'ap-northeast-2',
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    });
    const params = {
        Bucket: BUCKET_NAME,
        Key: req.params.filename,
    };
    res.attachment(iconvLite.encode(req.params.name, 'UTF-8').toString());
    const s3download = await s3.getObject(params).createReadStream();
    s3download.pipe(res);
    
})

router.post('/pdf', fileUpload(), (req, res, next) => {
    if (!req.files && !req.files.extFile) {
        res.status(400);
        res.end();
    }
    pdfparse(req.files.extFile).then(result => {
        res.send(result.text);
    });
});

module.exports = router;