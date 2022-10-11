// Custom MiddleWare
const db = require('../models');

exports.isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    return res.status(200).send({
        code: 401,
        error: "로그인이 필요합니다."
    });
};

exports.isNotLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return next();
    }
    return res.status(200).send({
        code: 401,
        error: "로그인한 사용자는 사용할 수 없습니다."
    });
};

exports.isOrganization = async (req, res, next) => {
    const findToken = await db.Companys.findOne({
        where: { organization: req.body.organization }
    });
    if (findToken != null) return res.status(200).send('이미 등록된 기업입니다.');
    return next();
}