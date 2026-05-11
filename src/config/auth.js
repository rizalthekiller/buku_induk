const { betterAuth } = require("better-auth");
const pool = require("./database");

const auth = betterAuth({
    database: pool,
    emailAndPassword: {
        enabled: true
    },
    // Kita tambahkan plugin atau config lain jika perlu
});

module.exports = { auth };
