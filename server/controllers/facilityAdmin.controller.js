const commonUtilService = require('../services/common.util.service');
const ErrorClass = require('../services/error.service');
const facilityAdmin = require('../models/facilityAdmin.model');
const adUtilService = require('../services/ad.util.service');
const Employee = require('../models/employee.model');
const {
    APPROVAL_LEVEL,
    SUPPORTED_PRACTICES,
    REQUEST_STATUS,
    MAIL_FOOTER,
    FACILITY_ADMIN_ROLES,
    L1_REQUIRED,
} = require('../constants/constants');
const NewBooking = require('../models/newBooking.model');
const { sendMailToEmployee } = require('../services/mailer.util.service');

module.exports.listFacilityAdmins = async (req, res, next) => {
    try {
        const isInvalidRequest = commonUtilService.validateRequest(
            req.query,
            {}
        );
        if (isInvalidRequest) {
            throw new ErrorClass('Invalid parameters sent', 400);
        }
        const facilityAdmins = await facilityAdmin
            .find()
            .select('-_id -__v -updatedAt');
        res.status(200).send({ status: 200, facilityAdmins });
    } catch (error) {
        next(error);
    }
};

module.exports.removeFacilityAdmin = async (req, res, next) => {
    try {
        const isInvalidRequest = commonUtilService.validateRequest(req.params, {
            empId: true,
        });
        if (isInvalidRequest) {
            throw new ErrorClass('Invalid parameters', 400);
        }

        const facilityAdminEmpId = req.params.empId.toLowerCase();
        if (req.emp.empId === facilityAdminEmpId) {
            throw new ErrorClass(
                'You cannot remove yourself as a facility admin',
                400
            );
        }

        const isFacilityAdmin = await facilityAdmin.findOne({
            empId: facilityAdminEmpId,
        });

        if (!isFacilityAdmin) {
            throw new ErrorClass(
                `${facilityAdminEmpId} is not a facility admin`,
                400
            );
        }

        const isSuperAdmin = await facilityAdmin.findOne({
            empId: req.emp.empId,
            isSuperAdmin: true,
        });
        if (!isSuperAdmin) {
            throw new ErrorClass(
                'You are not authorized to remove the facility admin',
                400
            );
        }
        const empInfo = await adUtilService.getEmpDetail(facilityAdminEmpId);
        let approvalLevel = APPROVAL_LEVEL.L0;
        if (!L1_REQUIRED.includes(empInfo.title)) {
            approvalLevel = APPROVAL_LEVEL.L1;
        }
        await facilityAdmin.deleteOne({
            empId: { $eq: facilityAdminEmpId },
        });
        await Employee.updateOne(
            { empId: facilityAdminEmpId },
            {
                $set: {
                    approvalLevel,
                    roles: [],
                    assignedPractices: [],
                    token: '',
                },
            }
        );

        res.send({
            status: 200,
            message: 'Facility admin successfully removed',
        }).status(200);

        const mailMessage = `<p>Hello ${isFacilityAdmin.name},</p><p>The <b>${req.emp.name}</b> has revoked your access as a facility administrator from the BookMySeat application. No action is required from your end.</p>${MAIL_FOOTER}`;
        if (isFacilityAdmin.email) {
            const mailOptions = {
                to: isFacilityAdmin.email,
                subject:
                    'BMS Notification: Your facility admin access has been revoked',
                html: mailMessage,
            };
            await sendMailToEmployee(mailOptions);
        }
    } catch (err) {
        next(err);
    }
};

module.exports.addFacilityAdmin = async (req, res, next) => {
    try {
        const isInvalidRequest = commonUtilService.validateRequest(req.body, {
            empId: true,
            practices: true,
            roles: true,
        });
        if (isInvalidRequest) {
            throw new ErrorClass('Invalid parameters', 400);
        }

        const { practices, roles } = req.body;
        const isSuperAdmin = await facilityAdmin.findOne({
            empId: req.emp.empId,
            isSuperAdmin: true,
        });
        if (!isSuperAdmin) {
            throw new ErrorClass('Not authorized to add facility admin', 403);
        }
        const isPractiseAvailable = practices.every((practice) =>
            SUPPORTED_PRACTICES.includes(practice)
        );
        if (!isPractiseAvailable) {
            throw new ErrorClass(
                'Either invalid practice(s) or one of the practice is not available',
                400
            );
        }
        const isRoleAvailable = roles.every((role) =>
            Object.values(FACILITY_ADMIN_ROLES).includes(role)
        );
        if (!isRoleAvailable) {
            throw new ErrorClass(
                'Either invalid role(s) or one of the role is not available',
                400
            );
        }

        const { empId } = req.emp;
        const facilityAdminMember = req.body.empId;

        const facilityAdminDetail = await adUtilService.getEmpDetail(
            facilityAdminMember
        );

        if (!practices.includes(facilityAdminDetail.ou)) {
            practices.push(facilityAdminDetail.ou);
        }

        const facilityAdminRequiredDetail = {
            empId: facilityAdminDetail.sAMAccountName,
            name: facilityAdminDetail.name,
            email: facilityAdminDetail.mail,
            assignedPractices: practices,
            roles,
            isSuperAdmin: false,
            createdBy: empId,
        };
        const isFacilityAdminExist = await facilityAdmin.updateOne(
            { empId: facilityAdminMember },
            facilityAdminRequiredDetail,
            { upsert: true }
        );
        await Employee.updateOne(
            { empId: facilityAdminMember },
            {
                $set: {
                    approvalLevel: APPROVAL_LEVEL.L2,
                    roles,
                    assignedPractices: practices,
                },
            }
        );

        await NewBooking.updateMany(
            {
                L1Approver: req.body.empId,
                currentStatus: REQUEST_STATUS.PENDING_L1,
            },
            { currentStatus: REQUEST_STATUS.PENDING_L2, isL1Required: false }
        );

        res.send({
            status: 200,
            message:
                isFacilityAdminExist.nModified === 0
                    ? 'Facility admin successfully added.'
                    : 'Facility admin successfully updated.',
        }).status(200);

        let mailMessage = `<p>Hello ${facilityAdminDetail.name},</p><p>The <b>${req.emp.name}</b> has added you as a facility administrator in the BookMySeat application with following role(s) :-</p>`;
        mailMessage +=
            '<table style="border: 1px solid black;border-collapse: collapse;">' +
            '<thead style="background-color:#6186b3; color:white">' +
            '<th style="border: 1px solid black;border-collapse: collapse;padding: 15px;"> Role(s) </th>' +
            '<th style="border: 1px solid black;border-collapse: collapse;padding: 15px;"> Practice(s) </th>' +
            '</thead>';
        mailMessage += `<tr> 
        <td style="border: 1px solid black;border-collapse: collapse;padding: 15px;">`;
        let counter = 0;
        roles.forEach((role) => {
            counter++;
            mailMessage += role;
            if (roles.length > counter) {
                mailMessage += ', ';
            }
        });
        mailMessage +=
            '</td><td style="border: 1px solid black;border-collapse: collapse;padding: 15px;">';
        counter = 0;
        practices.forEach((practice) => {
            counter++;
            mailMessage += `${practice}`;
            if (practices.length > counter) {
                mailMessage += ', ';
            }
        });
        mailMessage += `</td></tr></table> ${MAIL_FOOTER}`;
        if (facilityAdminDetail.mail) {
            const mailOptions = {
                to: facilityAdminDetail.mail,
                subject: 'BMS Notification: You are added as a facility admin',
                html: mailMessage,
            };
            await sendMailToEmployee(mailOptions);
        }
    } catch (error) {
        next(error);
    }
};
