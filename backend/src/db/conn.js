const mongoose = require('mongoose');

mongoose.connect(process.env.DB_URI, {useNewUrlParser : true})
    .then(() => {
        console.log('Database Connected....')
    }).catch((error) => {
        console.log('Database are not connected', error.message)
    })