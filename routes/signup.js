const {Router} = require('express');
const User = require('../models/user')
const router = Router();
const authController = require('../controllers/auth')

router.get('/', (req, res ) => {
    res.render('signup', {
        title:'Sign up'
    });
})

router.post('/', authController.signup);

module.exports = router