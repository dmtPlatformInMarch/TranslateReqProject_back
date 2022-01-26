module.exports = (sequelize, DataTypes) => {
    const Subrequest = sequelize.define('Subrequests', {
        req_lang: {
            type: DataTypes.STRING(40),
            allowNull: false,
        },
        grant_lang: {
            type: DataTypes.STRING(40),
            allowNull: false,
        },
        req_id : {

        },
    }, {
        // 한글 사용
        charset: 'utf8',
        collate: 'utf8_general_ci',
    });

    Subrequest.associate = (db) => {
        db.Subrequest.belongsTo(db.Requests); // column에 RequestId 추가
    };

    return Subrequest;
};