const mongoose = require('mongoose');
const {
    APPROVAL_LEVEL,
    FACILITY_ADMIN_ROLES,
    SUPPORTED_PRACTICES,
} = require('../constants/constants');

const employeeSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        empId: { type: String, required: true, unique: true },
        token: { type: String, required: false },
        approvalLevel: {
            enum: Object.values(APPROVAL_LEVEL),
            type: String,
            default: APPROVAL_LEVEL.L0,
        },
        roles: {
            type: [String],
            enum: Object.values(FACILITY_ADMIN_ROLES),
        },
        assignedPractices: {
            type: [String],
            enum: Object.values(SUPPORTED_PRACTICES),
        },
        isSuperAdmin: { type: Boolean, required: true },
    },
    { timestamps: true }
);

employeeSchema.post('save', (error, _, next) => {
    if (error.name === 'MongoError' && error.code === 11000)
        next(new Error('Added Employee already exists.'));
    else next(error);
});

const Employee = mongoose.model('Employee', employeeSchema);

module.exports = Employee;
