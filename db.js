const { Pool } = require('pg')
const config = require('./config')
var conString = `postgres://${config.USER}:${config.PSW}@${config.HOST}:${config.PORT}/${config.DB}`;
const pool = new Pool({
    connectionString: conString,
})

module.exports =  pool;
