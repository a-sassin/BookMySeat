const mongoose = require('mongoose');

const floorListingDatesSchema = new mongoose.Schema({
    listingFloorDate: { type: String, required: true, unique: true },
    createdAt: { type: Date, expires: '30s', default: Date.now },
});

floorListingDatesSchema.post('save', (error, doc, next) => {
    if (error.name === 'MongoError' && error.code === 11000)
        next(
            new Error(
                'Something went wrong, please select another date or try after sometime.'
            )
        );
    else next(error);
});

const FloorPlanListingDates = mongoose.model(
    'floorPlanListingDates',
    floorListingDatesSchema
);

module.exports = FloorPlanListingDates;
