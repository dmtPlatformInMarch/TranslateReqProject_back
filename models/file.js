module.exports = (sequelize, DataTypes) => {
    const File = sequelize.define('File', {
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
        }
    }, {
        // 한글 사용
        charset: 'utf8',
        collate: 'utf8_general_ci',
    });

    File.associate = (db) => {
        db.File.belongsTo(db.Requests, {
            onDelete: 'CASCADE',
        }); // column에 RequestId 추가
        db.File.belongsTo(db.User, {
            onDelete: 'CASCADE'
        }); // column에 UserId 추가
    };

    return File;
};