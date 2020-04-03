/**
 * Module dependencies.
 */
'use strict';

var mongoose = require('mongoose');
var crypto = require('crypto');
var Article = mongoose.model('Article');


var Schema = mongoose.Schema;
var oAuthTypes = [
    'twitter',
    'facebook',
    'google'
];

/**
 * User Schema
 */

var UserSchema = new Schema({
    name: {type: String, default: ''},
    email: {type: String, default: ''},
    username: {type: String, default: ''},
    selected_cursor: {type: String, default: '1'},
    skype: {type: String},
    firefox: {type: String},
    provider: {type: String, default: ''},
    hashed_password: {type: String, default: ''},
    salt: {type: String, default: ''},
    authToken: {type: String, default: ''},
    facebook: {},
    twitter: {},
    github: {},
    google: {},
    linkedin: {},
    createdAt: {type: Date, default: Date.now}
});

/**
 * Virtuals
 */

UserSchema
    .virtual('password')
    .set(function (password) {
        this._password = password;
        this.salt = this.makeSalt();
        this.hashed_password = this.encryptPassword(password);
    })
    .get(function () {
        return this._password;
    });

/**
 * Validations
 */

var validatePresenceOf = function (value) {
    return value && value.length;
};

// the below 5 validations only apply if you are signing up traditionally

// UserSchema.path('name').validate(function (name) {
//   if (this.skipValidation()) return true;
//   return name.length;
// }, 'Name cannot be blank');

UserSchema.path('email').validate(function (email) {
    if (this.skipValidation()) return true;
    return email.length;
}, 'Email cannot be blank');

// UserSchema.path('email').validate({
//     validator: function (email) {
//         return new Promise(function (resolve, reject) {
//             var User = mongoose.model('User');
//             if (this.skipValidation()) resolve(true);
//
//             // Check only when it is a new user or when email field is modified
//             if (this.isNew || this.isModified('email')) {
//                 User.find({email: email}).exec(function (err, users) {
//                     resolve(!err && users.length === 0);
//                 });
//             } else resolve(true);
//         });
//     },
//     message: 'Email already exists',
// });

UserSchema.path('username').validate(function (username) {
    if (this.skipValidation()) return true;
    return username.length;
}, 'Username cannot be blank');

UserSchema.path('hashed_password').validate(function (hashed_password) {
    if (this.skipValidation()) return true;
    return hashed_password.length;
}, 'Password cannot be blank');


/**
 * Pre-save hook
 */

UserSchema.pre('save', function (next) {
    if (!this.isNew) return next();

    if (!validatePresenceOf(this.password) && !this.skipValidation()) {
        next(new Error('Invalid password'));
    } else {
        next();
    }
});

/**
 * Methods
 */

UserSchema.methods = {

    /**
     * Authenticate - check if the passwords are the same
     *
     * @param {String} plainText
     * @return {Boolean}
     * @api public
     */

    authenticate: function (plainText) {
        return this.encryptPassword(plainText) === this.hashed_password;
    },

    /**
     * Make salt
     *
     * @return {String}
     * @api public
     */

    makeSalt: function () {
        return Math.round((new Date().valueOf() * Math.random())) + '';
    },

    /**
     * Encrypt password
     *
     * @param {String} password
     * @return {String}
     * @api public
     */

    encryptPassword: function (password) {
        if (!password) return '';
        try {
            return crypto
                .createHmac('sha1', this.salt)
                .update(password)
                .digest('hex');
        } catch (err) {
            return '';
        }
    },

    /**
     * Validation is not required if using OAuth
     */

    skipValidation: function () {
        return ~oAuthTypes.indexOf(this.provider);
    },


    articleCount: function () {
        var criteria = {user: this._id};
        return Article.count(criteria);
    }
};

/**
 * Statics
 */

UserSchema.statics = {

    /**
     * Load
     *
     * @param {Object} options
     * @param {Function} cb
     * @api private
     */

    load: function (options, cb) {
        options.select = options.select || 'name username createdAt selected_cursor email skype firefox';
        this.findOne(options.criteria)
            .select(options.select)
            .exec(cb);
    },


    /**
     * List articles
     *
     * @param {Object} options
     * @param {Function} cb
     * @api private
     */

    list: function (options, cb) {
        var criteria = options.criteria || {};

        this.find(criteria)
            // .populate('user', 'name username')
            .sort({'createdAt': -1}) // sort by date
            .limit(options.perPage)
            .skip(options.perPage * options.page)
            .exec(cb);
    }
};

mongoose.model('User', UserSchema);

