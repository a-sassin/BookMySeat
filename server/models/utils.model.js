const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
    {
        employeeId: { type: String, required: true, unique: true },
        socketId: { type: String, required: true, unique: true },
    },
    { timestamps: true }
);

clientSchema.post('save', (error, _, next) => {
    if (error.name === 'MongoError' && error.code === 11000)
        next(new Error('Socket client already connected.'));
    else next(error);
});

const Clients = mongoose.model('Clients', clientSchema);

module.exports = Clients;
