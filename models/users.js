module.exports = (sequelize, DataTypes) => {
    const Users = sequelize.define('Users', {
        email: {
            type: DataTypes.STRING(40),
            allowNull: false,
            unique: true,
        },
        password: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        nickname: {
            type: DataTypes.STRING(20),
            allowNull: false,
        },
        permission: {
            type: DataTypes.ENUM('user', 'admin', 'company'),
            defaultValue: 'user',
            allowNull: false,
        },
        organization: {
            type: DataTypes.STRING(20),
            allowNull: false
        }
    }, {
        // 한글 사용
        charset: 'utf8',
        collate: 'utf8_general_ci',
    });

    Users.associate = (db) => {
        db.Users.hasMany(db.Requests, {
            onDelete: 'CASCADE',
        });
        db.Users.hasMany(db.Files, {
            onDelete: 'CASCADE',
        });
    };

    return Users;
};