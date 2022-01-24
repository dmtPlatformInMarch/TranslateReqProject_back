const express = require('express');
const { isLoggedIn } = require('./middlewares');

const router = express.Router();

// 번역 의뢰
// router 시행 전에는 deSerialUser가 시행된다.
router.post('/', isLoggedIn, (req, res) => {
    
});

router.post('/file', isLoggedIn, (req, res) => {
    
});

module.exports = router;