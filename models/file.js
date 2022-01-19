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
    });
    
    File.associate = (db) => {
        db.File.belongsTo(db.Request);
        db.File.belongsTo(db.User);
    };

    return File;
};