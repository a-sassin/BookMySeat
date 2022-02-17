const mongoose = require('mongoose');

const bookedSeatsSchema = new mongoose.Schema({
    seatId: { type: String, required: true, unique: true },
    createdAt: { type: Date, expires: '30s', default: Date.now },
});

bookedSeatsSchema.post('save', (error, doc, next) => {
    if (error.name === 'MongoError' && error.code === 11000) {
        next(
            new Error(
                'Seat(s) already booked. Please select another seat and try again.'
            )
        );
    } else {
        next(error);
    }
});

const BookedSeats = mongoose.model('bookedSeats', bookedSeatsSchema);

module.exports = BookedSeats;
