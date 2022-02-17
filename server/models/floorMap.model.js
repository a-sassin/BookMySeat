const mongoose = require('mongoose');

const requiredNumber = { type: Number, required: true };
const requiredString = { type: String, required: true };

const seatsSchema = new mongoose.Schema({
    updatedDetails: {
        date: Date,
        status: String,
    },
    seatNo: requiredString,
    coordinates: requiredString,
    socialDistancingEnabled: { type: Boolean, required: true },
    bookedFor: String,
    bookedForName: String,
    status: String,
});

const floorMapSchema = new mongoose.Schema(
    {
        floorNo: requiredString,
        facilityName: requiredString,
        facilityId: requiredString,
        assignedPractices: [requiredString],
        totalSeatsCount: requiredNumber,
        availableSeatsCount: requiredNumber,
        createdBy: requiredString,
        updatedBy: requiredString,
        seats: [seatsSchema],
    },
    { timestamps: true }
);

const FloorMap = mongoose.model('floor-map', floorMapSchema);

module.exports = FloorMap;
