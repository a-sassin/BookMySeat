const mongoose = require('mongoose');
const { REQUEST_STATUS } = require('../constants/constants');

const newBookingSchema = new mongoose.Schema(
    {
        requestId: { type: String, required: true },
        empId: { type: String, required: true },
        practice: { type: String, required: true },
        facilityName: { type: String, required: true },
        floorNo: { type: String, required: true },
        fromDate: { type: Date, required: true },
        toDate: { type: Date, required: true },
        requestSummary: { type: String, required: true },
        floorId: { type: mongoose.Schema.ObjectId, required: false },
        bookedByName: { type: String, required: true },
        selectedSeats: [
            {
                seatId: { type: String },
                seatNo: { type: String, required: true },
                bookedFor: { type: String, required: true },
                bookedForName: { type: String, required: true },
                seatCancelledFrom: { type: Date, default: null },
            },
        ],
        blockedDates: [{ type: Date, required: false }],
        cancelledDates: [{ type: Date, required: false }],
        facilityId: { type: String, required: true },
        createdOn: { type: Date, required: false },
        lastModified: { type: Date, required: false },
        L1Approver: { type: String }, // 1st Lev Approver
        title: { type: String, required: true },
        currentStatus: {
            type: String,
            enum: Object.values(REQUEST_STATUS),
            default: REQUEST_STATUS.PENDING_L2,
        },
        isL1Required: { type: Boolean, default: false },
        rejectionReason: { type: String, required: false },
        vaccinationStatus: { type: Boolean, required: true },
        actionedUponBy: { type: String, default: '' },
    },
    { timestamps: true }
);

newBookingSchema.post('save', (error, doc, next) => {
    if (error.name === 'MongoError' && error.code === 11000)
        next(new Error('Booking with same ID already exists.'));
    else {
        next(error);
    }
});

const NewBooking = mongoose.model('new-booking', newBookingSchema);
module.exports = NewBooking;
