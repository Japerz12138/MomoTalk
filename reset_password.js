// 临时重置密码脚本，可以先用着，直到我把重置密码的功能写好（
// 使用方法: node reset_password.js 新密码

const bcrypt = require('bcrypt');

const newPassword = process.argv[2];

if (!newPassword) {
    console.error('错误: 请提供新密码');
    console.log('使用方法: node reset_password.js 你的新密码');
    process.exit(1);
}

bcrypt.hash(newPassword, 10, (err, hash) => {
    if (err) {
        console.error('加密失败:', err);
        process.exit(1);
    }
    
    console.log('\n新密码:', newPassword);
    console.log('加密后的哈希值:', hash);
    console.log('\n请在MySQL中执行以下SQL语句:');
    console.log('\nUPDATE users SET password = \'' + hash + '\' WHERE username = \'你的用户名\';');
    console.log('\n');
});


