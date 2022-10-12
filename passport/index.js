const passport = require("passport");
const local = require('./local');
const db = require("../models");

module.exports = () => {
    passport.serializeUser((user, done) => {
        // 세션에 저장하는 방법, 최대한 가볍게 저장
        console.log("유저 정보 : ", user);
        return done(null, user.id);
    });
    passport.deserializeUser(async (id, done) => {
        // 모든 요청에서 동작 -> DB접근이 매번 일어남. = 이걸 캐싱으로 최소화.
        // 사용자 정보를 복구하여 req.user에 넣어줌.
        // req.isAuthenticated를 true로 만들어 줌.
        try {
            const user = await db.Users.findOne({
                where: { id },
                attribute: ['id', 'nickname']
            });
            return done(null, user); // req.user, req.isAuthenticated() === true
        } catch (err) {
            console.log(err);
            return done(err);
        }
    });
    local();
};