const mongoose = require('mongoose');
const { BLOCK_STATUS } = require('../constants/constants');

const floorsSchema = new mongoose.Schema({
    _id: false,
    number: { type: String },
    status: {
        enum: Object.values(BLOCK_STATUS),
        type: String,
        default: BLOCK_STATUS.BLOCKED,
    },
});

const facilitySchema = new mongoose.Schema({
    _id: false,
    facilityId: {
        type: String,
        required: true,
    },
    floors: [floorsSchema],
});

const BlockHistorySchema = new mongoose.Schema({
    id: { type: String },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    facility: { type: facilitySchema, required: true },
    reason: { type: String, required: true },
    blockedBy: { type: String, required: true },
    blockedByName: { type: String, required: true },
},
    { timestamps: true }
);

module.exports = {
    BlockHistory: mongoose.model('Block-Request', BlockHistorySchema),
};
