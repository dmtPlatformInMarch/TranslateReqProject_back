// Custom MiddleWare
const db = require('../models')['mainDB'];

exports.isOrganization = async (req, res, next) => {
    const findToken = await db.Companys.findOne({
        where: { organization: encodeURI(req.body.organization) }
    });
    if (findToken != null) return res.status(200).send('이미 등록된 기업입니다.');
    return next();
}

exports.vaildToken = async (req, res, next) => {
    if (req.body.organization === undefined || req.headers.token === undefined) {
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
            organization: req.body.organization,
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