// Custom MiddleWare
const db = require('../models');

exports.isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    return res.status(410).send("로그인이 필요합니다.");
};

exports.isNotLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return next();
    }
    return res.status(402).send("로그인한 사용자는 사용할 수 없습니다.");
};

exports.isOrganization = async (req, res, next) => {
    const findToken = await db.Companys.findOne({
        where: { organization: req.body.organization }
    });
    if (findToken != null) return res.status(200).send('이미 등록된 기업입니다.');
    return next();
}

exports.vaildToken = async (req, res, next) => {
    if (req.headers.organization === undefined || req.headers.token === undefined) {
        return res.json({
            code: 403,
            error : `Empty Request Headers "Organization" and "Token".`
        });
    }
    if (req.headers.token.length != 32) {
        return res.json({
            coded: 400,
            error: `Invalid Token.`
        });
    }
    const checkToken = await db.Companys.findOne({
        where: {
            organization: req.headers.organization,
            token: req.headers.token
        }
    });
    if (checkToken === null) {
        return res.json({
            code: 404,
            error: `Invalid "Organization" or "token".`
        });
    }
    return next();
}