module.exports = (sequelize, DataTypes) => {
    const Files = sequelize.define('Files', {
        chainNumber: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        src: {
            type: DataTypes.STRING(200),
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
        field: {
            type: DataTypes.STRING(40),
            allowNull: false,
            defaultValue: '단순 번역',
        },
    }, {
        // 한글 사용
        charset: 'utf8',
        collate: 'utf8_general_ci',
    });

    Files.associate = (db) => {
        db.Files.belongsTo(db.Requests, {
            onDelete: 'CASCADE',
        }); // column에 RequestId 추가
        db.Files.belongsTo(db.Users, {
            onDelete: 'CASCADE',
        }); // column에 UserId 추가
    };

    return Files;
};