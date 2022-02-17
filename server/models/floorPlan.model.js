const mongoose = require('mongoose');
const { SEAT_STATUS } = require('../constants/constants');

const requiredString = { type: String, required: true };

const seatSchema = new mongoose.Schema({
    seatId: requiredString,
    seatNo: requiredString,
    coordinates: requiredString,
    status: {
        type: String,
        enum: Object.values(SEAT_STATUS),
    },
    bookedBy: String,
    bookedByName: String,
    bookedFor: String,
    bookedForName: String,
    bookedFrom: Date,
    bookedTo: Date,
    socialDistancingEnabled: Boolean,
});

const listingDataSchema = new mongoose.Schema({
    listingDate: { type: Date, required: true },
    totalSeatsCount: Number,
    availableSeatsCount: Number,
    isFloorAvailableForBooking: Boolean,
    bookedSeatsCount: Number,
    blockedSeatsCount: Number,
    seats: [seatSchema],
});

const floorPlanSchema = new mongoose.Schema(
    {
        floorId: String,
        assignedPractice: requiredString,
        facilityName: requiredString,
        indefiniteBlockingFromDate: { type: Date, default: '' },
        facilityId: requiredString,
        floorNo: { ...requiredString, unique: true },
        listingData: [listingDataSchema],
    },
    { timestamps: true, versionKey: false }
);

floorPlanSchema.post('save', (error, doc, next) => {
    if (error.name === 'MongoError' && error.code === 11000)
        next(new Error('Floor already exists.'));
    else next(error);
});

module.exports = {
    FloorPlan: mongoose.model('floor-plan', floorPlanSchema),
    ListingData: mongoose.model('listing-data', listingDataSchema),
    seat: mongoose.model('seat', seatSchema),
};
