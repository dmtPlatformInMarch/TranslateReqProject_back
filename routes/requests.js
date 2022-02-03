const express = require('express');

const db = require('../models');

const router = express.Router();

// 의뢰 가져오기
router.get('/', async (req, res, next) => { // GET /requsets?offset=10&limit=10
    try {
        const userRequests = await db.Requests.findAll({
            include: [{
                model: db.User,
                attributes: ['id', 'nickname'],
            }],
            order: [['createdAt', 'DESC']],
            offset: parseInt(req.query.offset, 10) || 0,
            limit: parseInt(req.query.limit, 10) || 10,
        });
        res.json(userRequests);
    } catch (err) {
        console.error(err);
        next(err);
    }
});

module.exports = router;