const express = require('express');
const router = express.Router();
const pool = require('../db');
const HashMap = require('hashmap');

router.get('/tree/:id', (req, res) => {
    const list = [];
    pool.query(`SELECT id, name, code, kind FROM territories  WHERE parent_id =  '${req.params.id}' `, (err, dbRes) => {
        if (req.query.level == 2 || req.query.level == 3) {
            pool.query(`SELECT id, parent_id FROM territories  WHERE id =  '${req.params.id}' `, (err, dbIdParentRes) => {
                pool.query(`SELECT parent_id FROM territories  WHERE id =  '${dbIdParentRes.rows[0]['parent_id']}' `, (err, dbIdGrandParentRes) => {
                    dbRes.rows.forEach(elm => {
                        const obj = {
                            'level':  parseInt(req.query.level),
                            'children': [],
                            'isToggled': false,
                            'isExpended': false,
                            'pcode': elm.kind + elm.code
                        }
                        if (req.query.level == 2) {
                            obj.idLevel0 = dbIdParentRes.rows[0]['parent_id'];
                            obj.idLevel1 = dbIdParentRes.rows[0]['id'];
                            obj.idLevel2 = elm.id;
                        }
                        if (req.query.level == 3) {
                            obj.idLevel0 = dbIdGrandParentRes.rows[0]['parent_id'];
                            obj.idLevel1 = dbIdParentRes.rows[0]['parent_id'];
                            obj.idLevel2 = dbIdParentRes.rows[0]['id'];
                            obj.idLevel3 = elm.id
                        }
                        list.push({
                            ...elm,
                            ...obj
                        });
                    })
                    res.send(list);
                })
            })
        }
        else {
            dbRes.rows.forEach(elm => {
                const obj = {
                    'children': [],
                    'isToggled': false,
                    'isExpended': false
                };
                list.push({
                    ...elm,
                    ...obj
                });
            })
            res.send(list);
        }
    })
})


router.get('/initTree', (req, res) => {
    pool.query("SELECT  id, name, kind, code FROM territories where kind = 'PAYS'", (err, dbPays) => {
    pool.query("SELECT  id, parent_id, name, kind, code FROM territories where kind = 'FRREGI' order by name asc", (err, dbRegion) => {
        pool.query("SELECT  id, parent_id, name, kind, code FROM territories where kind = 'FRDEPA'", (err, dbDepart) => {
                const hashDepartement = new HashMap();
                // hash map : key id region value : departement
                dbDepart.rows.forEach(departement => {
                    if (hashDepartement.has(departement.parent_id)) {
                        hashDepartement.set(hashDepartement.get(departement.parent_id).push(departement))
                    } else {
                        hashDepartement.set(departement.parent_id, [departement]);
                    }
                });
                //parse data
                const list = [];
                dbRegion.rows.forEach(region => {
                    const objRegionParsed = {};
                    objRegionParsed.idLevel0 = region.id;
                    objRegionParsed.name = region.name;
                    objRegionParsed.id = region.id;
                    objRegionParsed.level = 0;
                    objRegionParsed.isToggled = false;
                    objRegionParsed.isExpended = false;
                    objRegionParsed.pcode = region.kind + region.code

                    const listDepParsed = [];
                    hashDepartement.get(region.id).forEach(dep => {
                        const _obj = {};
                        _obj.idLevel0 = region.id;
                        _obj.idLevel1 = dep.id;
                        _obj.name = dep.name;
                        _obj.id = dep.id;
                        _obj.level = 1;
                        _obj.isToggled = false
                        _obj.isExpended = false;
                        _obj.pcode = dep.kind + dep.code;
                        listDepParsed.push(_obj);
                    });
                    objRegionParsed.children = listDepParsed
                    list.push(objRegionParsed);
                })
                const obj = {
                    name: dbPays.rows[0].name,
                    id: dbPays.rows[0].id,
                    level: -1,
                    isExpended:false,
                    isToggled: false,
                    children:list,
                    pcode: dbPays.rows[0].kind + dbPays.rows[0].code
                }
            
                res.type('json')
                res.send([obj]); // send the expected format to the tree view
            })
        })
    });
})

module.exports = router;