module.exports = (sequelize, DataTypes) => {
    const File = sequelize.define('File', {
        src: {
            type: DataTypes.STRING(200),
            allowNull: false,
        },
    }, {
        // 한글 사용
        charset: 'utf8',
        collate: 'utf8_general_ci',
        defaultScope: {
            where: {
                src: true,
            }
        }
    });
    
    File.associate = (db) => {
        db.File.belongsTo(db.Requests, {
            onDelete: 'CASCADE',
        }); // column에 RequestId 추가
        db.File.belongsTo(db.User); // column에 UserId 추가
    };

    return File;
};