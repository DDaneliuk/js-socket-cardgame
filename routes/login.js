const {Router} = require('express');
const router = Router();
const authController = require('../controllers/auth')

router.get('/', (req, res ) => {
    res.render('login', {
        title:'Login'
    });
})

router.post('/', authController.login);

module.exports = router