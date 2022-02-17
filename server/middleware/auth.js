const jwt = require('jsonwebtoken');
const Employee = require('../models/employee.model');
const ErrorClass = require('../services/error.service');

const auth = async (req, res, next) => {
    if (!req.headers.authorization) {
        res.status(400).send({
            message: 'Please provide authorization header',
        });
    } else {
        try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_KEY);
            const emp = await Employee.findOne({
                empId: decoded.empId.toLowerCase(),
                token,
            });
            if (!emp) throw new ErrorClass('No employee details found', 401);
            req.emp = emp;
            req.token = token;
            next();
        } catch (error) {
            if (error.message === 'jwt expired')
                res.status(401).send({
                    message: 'Token Expired, login again.',
                });
            else next(error);
        }
    }
};

module.exports = auth;
