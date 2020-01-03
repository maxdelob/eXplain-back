const express = require('express');
const router = express.Router();
const { Pool } = require('pg')
const config = require('../config')
var conString = `postgres://${config.USER}:${config.PSW}@${config.HOST}:${config.PORT}/${config.DB}`;
const pool = new Pool({
    connectionString: conString,
})


/* GET home page. */
router.get('/', function(req, res, next) {
  const rows =  pool.query('SELECT * FROM public.themes', (err, dbRes)=>   res.send(dbRes));
});

module.exports = router;
