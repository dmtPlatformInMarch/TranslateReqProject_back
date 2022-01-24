module.exports = (sequelize, DataTypes) => {
    const Request = sequelize.define('Request', {
        id: {
            type: DataTypes.STRING(40),
            allowNull: false,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(40),
            allowNull: false,
        },
        phone: {
            type: DataTypes.STRING(40),
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING(40),
            allowNull: false,
        },
        company: {
            type: DataTypes.STRING(40),
            allowNull: false,
        },
        second_phone: {
            type: DataTypes.STRING(40),
            allowNull: false,
        },
        date: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        req_lang: {
            type: DataTypes.STRING(40),
            allowNull: false,
        },
        grant_lang: {
            type: DataTypes.STRING(40),
            allowNull: false,
        },
        options: {
            type: DataTypes.STRING(40),
            allowNull: false,
        },
        trans_state: {
            type: DataTypes.STRING(40),
            allowNull: false,
        }
    }, {
        // 한글 사용
        charset: 'utf8',
        collate: 'utf8_general_ci',
    });

    Request.associate = (db) => {
        db.Request.belongsTo(db.User); // column에 UserId 추가
        db.Request.hasMany(db.File);
    };

    return Request;
};