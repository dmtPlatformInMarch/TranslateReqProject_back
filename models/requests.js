module.exports = (sequelize, DataTypes) => {
    const Requests = sequelize.define('Requests', {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
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
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        options: {
            type: DataTypes.STRING(100),
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

    Requests.associate = (db) => {
        db.Requests.belongsTo(db.User, {
            onDelete: 'CASCADE',
        }); // 본인 column에 UserId 추가
        db.Requests.hasMany(db.File);
    };

    return Requests;
};