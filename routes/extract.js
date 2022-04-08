const express = require('express');
const fs = require('fs');
const AdmZip = require('adm-zip');
const path = require('path');
const pdfparse = require('pdf-parse');

const router = express.Router();

router.get('/', (req, res) => {
    return res.status(200).send('연결 안정적');
});

router.post('/docx', (req, res, next) => {
    const localURL = 'C:/Users/yunji/Desktop/test.docx';
    let str = "";
    
    // 버퍼 읽기
    /*let buffer = '';
    req.on('data', function (chunk) {
        buffer += chunk.toString();
    });

    req.on('data', function () {
        str = buffer;
    });*/

    const zip = new AdmZip(localURL);
    //console.log(req.body);
    const exp = /<w:t [\s\S]*?<\/w:t>/ig;
    let contentXml = zip.readAsText("word/document.xml");
    //console.log("Body : " + contentXml);
    if (contentXml != '' || contentXml.match(exp) != null) {
        contentXml.match(exp).forEach((item)=>{
            str += item.slice(item.indexOf('>') + 1,-6);
            str += '\n';
        });
    } else {
        console.log("Xml : " + contentXml);
    }

    return res.status(200).json(str);
});

router.post('/pdf', (req, res, next) => {
    if ( !req.files && !req.files.extFile) {
        res.status(400);
        res.end();
    }
    pdfparse(req.files.extFile).then(result => {
        res.send(result.text);
    });
});

module.exports = router;