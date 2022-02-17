const mongoose = require('mongoose');
const { FACILITY_ADMIN_ROLES } = require('../constants/constants');

const facilityAdminSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        empId: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
        },
        assignedPractices: {
            type: Array,
        },
        roles: {
            type: [String],
            enum: Object.values(FACILITY_ADMIN_ROLES),
        },
        email: { type: String, required: true, unique: true },
        createdBy: { type: String, required: true },
        isSuperAdmin: { type: Boolean },
    },
    { timestamps: true }
);

facilityAdminSchema.post('save', (error, doc, next) => {
    if (error.name === 'MongoError' && error.code === 11000)
        next(new Error('Added facility admin already exists.'));
    else next(error);
});

const facilityAdmins = mongoose.model('facilityAdmins', facilityAdminSchema);

module.exports = facilityAdmins;
