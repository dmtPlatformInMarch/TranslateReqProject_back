const express = require('express');

const db = require('../models');

const router = express.Router();

// 의뢰 가져오기
router.get('/', async (req, res, next) => { // GET /requsets
    try {
        const userRequests = await db.Requests.findAll({
            include: [{
                model: db.File,
                attributes: ['src', 'req_lang', 'grant_lang'],
            }],
            order: [['createdAt', 'DESC']],
        });
        res.json(userRequests);
    } catch (err) {
        console.error(err);
        next(err);
    }
});

module.exports = router;