const express = require('express');
const router = express.Router();
const pool = require('../db');
const HashMap = require('hashmap');

const hashAdmLevels = new HashMap();
hashAdmLevels.set('0', 'FRDEPA');
hashAdmLevels.set('1', 'FREPCI');
hashAdmLevels.set('2', 'FRCOMM');

router.get('/getTreeData', (req, res, next) => {
    pool.query("SELECT  id, parent_id, name FROM territories where kind = 'FRREGI' order by name asc", (err, dbRegion) => {
        pool.query("SELECT  id, parent_id, name FROM territories where kind = 'FRDEPA'", (err, dbDepart) => {
            pool.query("SELECT  id, parent_id, name FROM territories where kind = 'FREPCI'", (err, dbEpci) => {
                const hashDepartement = new HashMap();
                // hash map : key id region value : departement
                dbDepart.rows.forEach(departement => {
                    if (hashDepartement.has(departement.parent_id)) {
                        hashDepartement.set(hashDepartement.get(departement.parent_id).push(departement))
                    } else {
                        hashDepartement.set(departement.parent_id, [departement]);
                    }
                });

                //  // hash map : key id departement value : epci
                //     const hashEpci = new HashMap();
                //     dbEpci.rows.forEach(epci=>{
                //         if(hashEpci.has(epci.parent_id)){
                //             hashEpci.set(hashEpci.get(epci.parent_id).push(epci))
                //         } else {
                //             hashEpci.set(epci.parent_id, [epci]);
                //         }
                //     })

                //parse data
                const obj = {};
                const list = [];
                dbRegion.rows.forEach(region => {
                    if (hashDepartement.get(region.id).length === 1) { // avoid misread of the hashmpa (it has to be an unique name)
                        list.push([region.name, hashDepartement.get(region.id).map(elm => elm.name + ' (Dep.)')]);
                    } else {
                        list.push([region.name, hashDepartement.get(region.id).map(elm => elm.name)]);
                    }

                    // only region and dep


                    //obj[region.name]= hashDepartement.get(region.id).map(elm => elm.name);


                    // region dep epci 



                    //     const objDepartements = {}
                    //     const departements =  hashDepartement.get(region.id);
                    //     departements.forEach(dep => {
                    //         if(hashEpci.get(dep.id)) {
                    //             objDepartements[dep.name] = hashEpci.get(dep.id).map(elm=> elm.name);
                    //         }
                    //     });
                    //     obj[region.name] = objDepartements;

                })

                res.type('json')
                res.send(list); // send the expected format to the tree view
            })
        })
    });
});

router.get('/getIdByNameAndTreeLevel')

router.get('/getCommunesByDepartements/:name', (req, res, next) => {
    pool.query(`SELECT id FROM territories where kind = 'FRDEPA' AND name =  '${req.params.name}' `, (err, dbDepart) => {
        if (dbDepart.rows.length === 1) {
            pool.query(`SELECT  id, parent_id, name FROM territories where kind = 'FREPCI' AND parent_id =  '${dbDepart.rows[0].id}'`, (err, dbEpci) => {
                const ecpiIds = dbEpci.rows.map(elm => elm.id);
                pool.query(`SELECT id, parent_id, name FROM territories where  parent_id IN (${ecpiIds})`, (err, dbCommune) => {
                    const communes = dbCommune.rows.map(elm => elm.name);
                    // join epci and communes in hashmap
                    const hashCommune = new HashMap();
                    dbCommune.rows.forEach(commune => {
                        if (hashCommune.has(commune.parent_id)) {
                            hashCommune.set(hashCommune.get(commune.parent_id).push(commune))
                        } else {
                            hashCommune.set(commune.parent_id, [commune]);
                        }
                    });

                    // format hashmap 
                    const list = [];
                    dbEpci.rows.forEach(epci => {
                        list.push([epci.name, hashCommune.get(epci.id).map(elm => elm.name)])
                    });
                    res.send(list)
                })
            })
        } else {
            console.log('not normal')
        }
    })
});

router.get('/regions', (req, res) => {
    pool.query(`SELECT id, name, 0 as level FROM territories where kind = 'FRREGI'`, (err, dbRes) => {
        res.send(dbRes.rows);
    });
});

router.get('/departements', (req, res) => {
    pool.query(`SELECT id, name FROM territories where kind = 'FRDEPA'`, (err, dbDepart) => {
        res.send(dbDepart.rows);
    });
});

router.post('/findByName', (req, res) => {
    let adm;
    switch (req.body.level) {
        case 0:
            adm = 'FRDEPA';
            break
        case 1:
            adm = 'FREPCI';
            break
        case 2:
            adm = 'FRCOMM';
            break
        default:
            adm = 'FRREGI';
    }
    pool.query(`SELECT id, name FROM territories where name = '${req.body.name}' AND kind = '${adm}'`, (err, dbRes) => {
        res.send(dbRes.rows[0]);
    })
})

// router.get('/tree/:id', (req, res)=> {

//     pool.query(`SELECT name, (SELECT name FROM territories WHERE id = '${req.params.id}' ) as parent_name  FROM territories  WHERE parent_id =  '${req.params.id}' `, (err, dbRes) => {

//         res.send([dbRes.rows[0].parent_name , dbRes.rows.map(elm => elm.name)]);
//     })
// })

router.get('/tree/:id', (req, res) => {
    const list = [];
    pool.query(`SELECT id, name FROM territories  WHERE parent_id =  '${req.params.id}' `, (err, dbRes) => {
        if (req.query.level == 2 || req.query.level == 3) {
            pool.query(`SELECT id, parent_id FROM territories  WHERE id =  '${req.params.id}' `, (err, dbIdParentRes) => {
                pool.query(`SELECT parent_id FROM territories  WHERE id =  '${dbIdParentRes.rows[0]['parent_id']}' `, (err, dbIdGrandParentRes) => {
                    dbRes.rows.forEach(elm => {
                        const obj = {
                            'level':  parseInt(req.query.level),
                            'children': [],
                            'isToggled': false,
                            'isExpended': false
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
    pool.query("SELECT  id, name FROM territories where kind = 'PAYS'", (err, dbPays) => {
    pool.query("SELECT  id, parent_id, name FROM territories where kind = 'FRREGI' order by name asc", (err, dbRegion) => {
        pool.query("SELECT  id, parent_id, name FROM territories where kind = 'FRDEPA'", (err, dbDepart) => {
            pool.query("SELECT  id, parent_id, name FROM territories where kind = 'FREPCI'", (err, dbEpci) => {
                const hashDepartement = new HashMap();
                // hash map : key id region value : departement
                dbDepart.rows.forEach(departement => {
                    if (hashDepartement.has(departement.parent_id)) {
                        hashDepartement.set(hashDepartement.get(departement.parent_id).push(departement))
                    } else {
                        hashDepartement.set(departement.parent_id, [departement]);
                    }
                });

                //  // hash map : key id departement value : epci
                // const hashEpci = new HashMap();
                // dbEpci.rows.forEach(epci=>{
                //     if(hashEpci.has(epci.parent_id)){
                //         hashEpci.set(hashEpci.get(epci.parent_id).push(epci))
                //     } else {
                //         hashEpci.set(epci.parent_id, [epci]);
                //     }
                // })

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


                        // if(hashEpci.get(dep.id)){ // no EPCI for Hauts-de-Seine for example
                        //     const listEpciParsed = [];
                        //     hashEpci.get(dep.id).forEach(epci => {
                        //         const _obj = {};
                        //         _obj.idLevel0 = region.id;
                        //         _obj.idLevel1 = dep.id;
                        //         _obj.idLevel2 = epci.id;
                        //         _obj.name = epci.name;
                        //         _obj.id = epci.id;
                        //         _obj.level = 2;
                        //         listEpciParsed.push(_obj);
                        //     });
                        //     _obj.children = listEpciParsed;
                        // }

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
                    children:list
                }
            
                res.type('json')
                res.send([obj]); // send the expected format to the tree view
            })
        })
    });
})

})

module.exports = router;