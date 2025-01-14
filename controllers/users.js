const express = require('express')
const router = express.Router()
const db = require('../models')
const cryptojs = require('crypto-js')
const bcrypt = require('bcryptjs')

// GET /users/new --  form to create new user
router.get('/new', (req, res)=>{
    res.render('users/new.ejs', { msg: null })
})


// POST /users -- create a new user and redirect to index
router.post('/', async (req, res, next)=>{
    try{
        // try to create the user
        // hash password
        const hashedPassword = bcrypt.hashSync(req.body.password, 12)
        const [user, created] = await db.user.findOrCreate({
            where:{ email: req.body.email },
            defaults:{ password: hashedPassword }
        })

        // if the user is new
        if (created) {
            // log them in by giving them a cookie
            // res.cookie('cookie name', 'cookie data')
            const encryptedId = cryptojs.AES.encrypt(user.id.toString(), process.env.ENC_KEY).toString()
            res.cookie('userId', encryptedId)
            // redirect to home page (future - redirect elsewhere like dashboard)
            res.redirect('/users/profile')
       
        } else {
            // if the user was not created
                // rerender the login form with a message for the user 
            console.log('that email already exist')
            res.render('users/new.ejs', {msg: 'email already exists 😑'})
        }

    } catch(err){
        next(err)
    }
})

// GET /users/login -- renders a login form
router.get('/login', (req, res)=>{
    res.render('users/login.ejs', {msg: null })
})

// POST /users/login -- it authenticates user creds againt db
router.post('/login', async(req, res, next)=>{
    try{
        // look up the user in the db based on email
        const foundUser = await db.user.findOne({
            where: {email: req.body.email}
        })
        const msg = 'your email/password is not correct'
        // if the user is not found -- display te login form and msg
        if (!foundUser){
            console.log('email not found')
            res.render('users/login.ejs', {msg})
            return // end the function
        }
        // otherwise, check the provided password against the password in the db
            // if they m,atch -- send a cookie to log them in
            // if not --  render the login form w a message
        // TODO hash the password
        const compare = bcrypt.compareSync(req.body.password, foundUser.password)
        if(compare){
            // if they match give user a cookie
            const encryptedId = cryptojs.AES.encrypt(foundUser.id.toString(), process.env.ENC_KEY).toString()
            res.cookie('userId', encryptedId)
            // redirect to profile
            res.redirect('/users/profile')
        } else {
            res.render('users/login.ejs', {msg})
        }
    } catch (err){
        next(err)
    }
})

// GET /users/logout -- clear cookies to log user out
router.get('/logout', (req,res)=>{
    // clear the cookie from storage
    res.clearCookie('userId')
    // redirtect route
    res.redirect('/')
})

router.get('/profile', (req, res)=>{
    // check if user is authorized
    if (!res.locals.user){
        res.render('users/login.ejs', {msg: 'please log in to continue'})
        return
    }
    res.render('users/profile', {user: res.locals.user})
})

module.exports = router