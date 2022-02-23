const express = require('express');

const db = require('../models');

const router = express.Router();

// 의뢰 목록 반환
router.get('/requests', async (req, res, next) => {
    try {
        const allRequests = await db.Requests.findAll({
            include: [{
                model: db.Files,
                attributes: ['chainNumber', 'src', 'req_lang', 'grant_lang', 'field'],
            }, {
                model: db.Users,
                attributes: ['nickname', 'email'],
            }],
            order: [['id', 'DESC']],
        });
        return res.json(allRequests);
    } catch (err) {
        console.log(err);
        next(err);
    }
});

router.get('/users', async (req, res, next) => {
    try {
        const userRequests = await db.Users.findAll({
            where: { permission: 'user' },
            attributes: ['nickname', 'email', 'permission', 'createdAt'],
            order: [['id', 'DESC']],
        });
        return res.json(userRequests);
    } catch (err) {
        console.log(err);
        next(err);
    }
});

// 추가 구현 필요
router.get('/file/:id', async (req, res, next) => {
    try {
        const fileRequests = await db.Files.findOne({
            where: { id: req.params.id },
        });
        res.json(fileRequests);
    } catch (err) {
        console.log(err);
        next(err);
    }
})

router.delete('/user/delete/:email', async (req, res, next) => {
    try {
        await db.Users.destroy({
            where: {
                email: req.params.email,
            }
        })
        return res.send('유저 강제 탈퇴');
    } catch (err) {
        console.log(err);
        next(err);
    }
});

module.exports = router;