const express = require('express');
const fileUpload = require('express-fileupload');
const AdmZip = require('adm-zip');
const pdfparse = require('pdf-parse');

const router = express.Router();

router.get('/', (req, res) => {
    return res.status(200).send('연결 안정적');
});

router.post('/docx', (req, res, next) => {
    return res.status(200).send('docx 파일은 미구현입니다.');
});

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