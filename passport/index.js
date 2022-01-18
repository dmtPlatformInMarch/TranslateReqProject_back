const passport = require("passport");

module.exports = () => {
    passport.serializeUser((user, done) => {
        // 세션에 저장하는 방법, 최대한 가볍게 저장
        return done(null,user.id);
    });
    passport.deserializeUser(() => {
        // 
    });
};