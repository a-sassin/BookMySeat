const mongoose = require('mongoose');
const { VISIT_REQ_STATUS } = require('../constants/constants');

const visitBookingSchema = new mongoose.Schema({
    requestId: { type: String, required: true },
    empId: { type: String, required: true },
    bookedByName: { type: String, required: true },
    practice: { type: String },
    date: { type: Date, required: true },
    requestSummary: { type: String },
    category: { type: String, required: true },
    concernedEmpId: { type: String, required: true },
    concernedEmpName: { type: String, required: true },
    currentStatus: {
        type: String,
        enum: Object.values(VISIT_REQ_STATUS),
        default: VISIT_REQ_STATUS.PENDING,
    },
    vaccinationStatus: { type: Boolean, required: true },
    actionedUponBy: { type: String },
});

visitBookingSchema.post('save', (error, doc, next) => {
    if (error.name === 'MongoError' && error.code === 11000)
        next(new Error('Booking with same ID already exists.'));
    else {
        next(error);
    }
});

const VisitBooking = mongoose.model('visit-booking', visitBookingSchema);
module.exports = VisitBooking;
