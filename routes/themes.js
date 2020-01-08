const express = require('express');
const router = express.Router();
const pool = require('../db');


/* GET users listing. */
router.get('/', function(req, res, next) {
    pool.query('SELECT id, name FROM public.themes', (err, dbRes)=>   res.send(dbRes.rows))
});

module.exports = router;



// [a-z0-9_|-]