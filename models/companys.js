module.exports = (sequelize, DataTypes) => {
    const Companys = sequelize.define('Companys', {
        organization: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        token: {
            type: DataTypes.STRING(100),
            allowNull: false
        }
    }, {
        // 한글 사용
        charset: 'utf8',
        collate: 'utf8_general_ci',
    });
    
    Companys.associate = () => {
        
    }

    return Companys;
};