const bcrypt = require('bcryptjs');
async function test() {
    try {
        const hash = await bcrypt.hash('password', 10);
        console.log('Bcrypt success:', hash);
    } catch (e) {
        console.error('Bcrypt error:', e);
    }
}
test();
