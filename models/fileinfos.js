module.exports = (sequelize, DataTypes) => {
    const Fileinfos = sequelize.define('Fileinfos', {
        file_type: {
            type: DataTypes.STRING(10),
            allowNull: false,
        },
        words: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        cost: {
            type: DataTypes.INTEGER,
            allowNull: false,
        }
    }, {
        charset: 'utf8',
        collate: 'utf8_general_ci',
    });

    Fileinfos.associate = (db) => {
        db.Fileinfos.belongsTo(db.Files, {
            onDelete: 'CASCADE',
        });
    }

    return Fileinfos;
}