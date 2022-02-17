const jwt = require('jsonwebtoken');
const cryptoJS = require('crypto-js');
const Employee = require('../models/employee.model');
const {
    validateRequest,
    validateFacilityAdmin,
} = require('../services/common.util.service');
const {
    APPROVAL_LEVEL,
    L1_REQUIRED,
    AD_ACCOUNT_DISABLED,
} = require('../constants/constants');
const ErrorClass = require('../services/error.service');
const { ad, getEmpDetails } = require('../services/ad.util.service');

const formatLoginWithDomain = (empId) => {
    const domain =
        process.env.ENVIRONMENT === 'prod' ? 'gslab.com' : 'testdomain.com';
    return `${empId}@${domain}`;
};

exports.employeeLogIn = async (req, res, next) => {
    try {
        const isInvalidRequest = validateRequest(req.body, {
            empId: true,
            password: true,
            keepMeSignedIn: true,
        });
        if (isInvalidRequest) {
            throw new ErrorClass(
                'Bad Request. Either missing or Invalid request data',
                400
            );
        }
        const employeeId = req.body.empId;
        const { keepMeSignedIn } = req.body;
        const password = cryptoJS.AES.decrypt(
            req.body.password,
            process.env.encryptSecretKey
        ).toString(cryptoJS.enc.Utf8);

        await ad().authenticate(
            formatLoginWithDomain(employeeId),
            password,
            async (err, auth) => {
                try {
                    if (err) {
                        throw new Error('User authentication failed!');
                    }
                    if (auth) {
                        console.info('Authenticated using AD!');
                        const empADDetails = await getEmpDetails(
                            req.body.empId
                        );

                        if (!empADDetails) {
                            throw new Error(`User: ${employeeId} not found.`);
                        }
                        const token = generateToken(employeeId, keepMeSignedIn);
                        let employeeDetails = {};
                        const empId = employeeId.toLowerCase();
                        const employeeDetailsDB = await Employee.findOne({
                            empId,
                        });

                        let isFirstTimeLogin = false;
                        if (employeeDetailsDB) {
                            employeeDetails = await saveTokenInExistingRecord(
                                employeeDetailsDB,
                                token
                            );
                        } else {
                            employeeDetails = await createNewRecord(
                                empADDetails,
                                token,
                                req
                            );
                            isFirstTimeLogin = true;
                        }
                        employeeDetails = await Employee.findOne({
                            empId,
                        }).select('-_id -createdAt -updatedAt -__v');
                        employeeDetails = {
                            ...employeeDetails._doc,
                            ...empADDetails,
                            isFirstTimeLogin,
                        };
                        res.status(200).send({
                            data: employeeDetails,
                        });
                    }
                } catch (error) {
                    res.status(401).send({ message: error.message });
                }
            }
        );
    } catch (err) {
        next(err);
    }
};

exports.employeeLogOut = async (req, res) => {
    try {
        await Employee.updateOne({ empId: req.emp.empId }, { token: '' });
        res.send({ message: 'Successfully Logged Out' });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

async function saveTokenInExistingRecord(employeeDetailsDB, token) {
    const employeeDetails = {};
    employeeDetailsDB.token = token;
    await employeeDetailsDB.save();
    Object.assign(employeeDetails, employeeDetailsDB);
    return employeeDetails;
}

async function createNewRecord(employeeDetailsAD, token, req) {
    let approvalLevel = APPROVAL_LEVEL.L0,
        isSuperAdmin = false,
        roles = [],
        assignedPractices = [];

    const facilityAdmin = await validateFacilityAdmin(req.body.empId);
    if (facilityAdmin) {
        approvalLevel = APPROVAL_LEVEL.L2;
        isSuperAdmin = facilityAdmin.isSuperAdmin;
        roles = facilityAdmin.roles;
        assignedPractices = facilityAdmin.assignedPractices;
    } else if (!L1_REQUIRED.includes(employeeDetailsAD.designation)) {
        approvalLevel = APPROVAL_LEVEL.L1;
    }
    return Employee.create({
        name: employeeDetailsAD.name,
        empId: employeeDetailsAD.empId.toLowerCase(),
        token,
        approvalLevel,
        isSuperAdmin,
        roles,
        assignedPractices,
    });
}

function generateToken(empId, keepMeSignedIn) {
    const expiryTime = keepMeSignedIn ? '7d' : '30m';
    return jwt.sign({ empId }, process.env.JWT_KEY, {
        expiresIn: expiryTime,
    });
}

module.exports.getEmployees = async (req, res, next) => {
    try {
        const isInvalidRequest = validateRequest(req.query, {
            search: false,
            limit: false,
            practices: false,
        });
        if (isInvalidRequest) {
            throw new ErrorClass('Invalid parameters', 400);
        }
        let { search, practices } = req.query;
        const { limit } = req.query;
        const usersData = [];
        search = search ? `${search.trim()}*` : '';
        if (typeof practices === 'string') {
            practices = new Array(practices);
        }
        if (practices && practices.length) {
            await Promise.all(
                practices.map(async (practice) => {
                    practice =
                        practice === 'IDM' ? 'I*M' : `${practice.trim()}`;
                    const users = await getUsers(limit, search, practice);
                    if (users) {
                        users.forEach((user) => {
                            if (user.sAMAccountName) {
                                usersData.push({
                                    empId: user.sAMAccountName.toLowerCase(),
                                    name: user.name,
                                });
                            }
                        });
                    }
                })
            );
        } else {
            const practice = '*';
            const users = await getUsers(limit, search, practice);
            if (users) {
                users.forEach((user) => {
                    if (user.sAMAccountName) {
                        usersData.push({
                            empId: user.sAMAccountName.toLowerCase(),
                            name: user.name,
                        });
                    }
                });
            }
        }
        res.send({
            status: 200,
            data: usersData,
        }).status(200);
    } catch (err) {
        next(err);
    }
};

async function getUsers(limit, search, practice) {
    const opts = {
        sizeLimit: +limit || 30,
        filter: `(&(name=*${search})(ou=${practice})(!(userAccountControl=${AD_ACCOUNT_DISABLED}))(objectcategory=person))`,
    };
    return new Promise((resolve, reject) => {
        ad().findUsers(opts, (err, users) => {
            if (err) {
                reject(err);
            }
            resolve(users);
        });
    });
}
