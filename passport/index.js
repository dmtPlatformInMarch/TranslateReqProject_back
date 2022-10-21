const passport = require("passport");
const { Strategy: LocalStrategy } = require('passport-local');
const { ExtractJwt, Strategy: JWTStrategy } = require('passport-jwt');
const bcrypt = require('bcrypt');
const db = require("../models")['mainDB'];

const passportConfig = {
    usernameField: 'email',
    passwordField: 'password'
}

const JWTConfig = {
    jwtFromRequest: ExtractJwt.fromHeader('authorization'),
    secretOrKey: process.env.JWT_TOKEN_SECRET
}

const passportVerify = async (email, password, done) => {
    try {
        const user = await db.Users.findOne({
            where: { email: email },
        });
        if (!user) {
            return done(null, false, { reason: '존재하지 않는 사용자입니다.' });
        }
        const comparePassword = await bcrypt.compare(password, user.password);
        if (!comparePassword) {
           return done(null, false, { reason: '잘못된 비밀번호입니다.' });
        }
        return done(null, user); // req.user, req.isAuthenticated() === true
    } catch (err) {
        console.log(err);
        return done(err);
    }
}

const JWTVerify = async (jwtPayload, done) => {
    try {
        const user = await db.Users.findOne({
            where: { email: jwtPayload.email }
        });
        if (user) {
            return done(null, user);
        }
        return done(null, false, { reason: '올바르지 않은 인증정보 입니다.' });
    } catch (err) {
        console.log(err);
        return done(err);
    }
}

module.exports = () => {
    passport.use('local', new LocalStrategy(passportConfig, passportVerify));
    passport.use('jwt', new JWTStrategy(JWTConfig, JWTVerify));
};