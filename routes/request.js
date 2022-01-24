const express = require('express');
const multer = require('multer');
const path = require('path');

const { isLoggedIn } = require('./middlewares');

const router = express.Router();

const upload = multer({
    // 임시스토리지 -> 나중에 교체
    storage: multer.diskStorage({
        destination(req, file, done){
            // 저장장소
            done(null, 'uploads');
        },
        filename(req, file, done){
            // 파일이름양식
            const ext = path.extname(file.originalname); // 확장자
            const basename = path.basename(file.originalname, ext); // 이름
            done(null, basename + Date.now() + ext);
        },
    }),
    limit: { fileSize: 20 * 1024 * 1024}, // 20MB (byte단위)
});

// 번역 파일 업로드
// 의뢰와 파일은 따로 등록을 해야함.
router.post('/file', isLoggedIn, upload.single('fileKey'), (req, res) => {
    console.log(req.file);
    res.json(req.file.filename);
});

// 번역 의뢰
// router 시행 전에는 deSerialUser가 시행된다.
router.post('/', isLoggedIn, (req, res) => {
    
});

module.exports = router;