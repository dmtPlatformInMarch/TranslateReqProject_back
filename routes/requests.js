const express = require('express');

const db = require('../models');

const router = express.Router();

// id 유저의 의뢰 가져오기
router.get('/:id', async (req, res, next) => { // GET /requsets
    try {
        const userRequests = await db.Requests.findAll({
            where: { Userid: req.params.id },
            include: [{
                model: db.Files,
                attributes: ['chainNumber', 'src', 'req_lang', 'grant_lang', 'field'],
            }],
            order: [['id', 'DESC']],
        });
        res.json(userRequests);
    } catch (err) {
        console.error(err);
        next(err);
    }
});

module.exports = router;