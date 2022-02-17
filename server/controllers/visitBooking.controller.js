const moment = require('moment');
const excel = require('exceljs');
const {
    ALLOWED_MAX_FUTURE_DAYS,
    VISIT_REQ_STATUS,
    CATEGORY_EMAILS,
    MAIL_FOOTER,
    VACCINATION_STATUS,
    DATE_FORMAT,
    FACILITY_ADMIN_ROLES,
    VISIT_MIN_DATE,
    EXTRA_PRACTICES,
} = require('../constants/constants');
const VisitBooking = require('../models/visitBookings.model');
const FacilityAdminModel = require('../models/facilityAdmin.model');
const {
    validateRequest,
    formatDate,
    getRequestId,
    checkPaginationParams,
    getSortingObject,
    getPaginationObject,
    validateFacilityAdmin,
    filterDate,
    isVisitApprover,
    arrayOfEmails,
} = require('../services/common.util.service');
const ErrorClass = require('../services/error.service');
const { sendMailToEmployee } = require('../services/mailer.util.service');
const { getEmpDetail } = require('../services/ad.util.service');

exports.createVisitBooking = async (req, res, next) => {
    try {
        const isInvalidRequest = validateRequest(req.body, {
            date: true,
            requestSummary: false,
            category: true,
            concernedEmpId: true,
            concernedEmpName: true,
            practice: false,
            vaccinationStatus: true,
        });
        if (isInvalidRequest) {
            throw new ErrorClass(
                'Invalid request. Contains invalid or missing data',
                400
            );
        }
        const isCategory = Object.keys(CATEGORY_EMAILS).includes(
            req.body.category
        );
        if (!isCategory) {
            throw new ErrorClass('Invalid category.', 400);
        }

        const { empId, name } = req.emp;
        const { date, practice, concernedEmpId, category, requestSummary } =
            req.body;
        if (concernedEmpId === empId) {
            throw new ErrorClass(
                'You can not raise a visit request to meet yourself',
                400
            );
        }
        const bookingDate = formatDate(date);

        validateDates(bookingDate);

        const query = {
            empId,
            date: bookingDate,
            $or: [
                { currentStatus: VISIT_REQ_STATUS.PENDING },
                { currentStatus: VISIT_REQ_STATUS.APPROVED },
            ],
        };
        const isAlreadyBooked = await VisitBooking.findOne(query);
        if (isAlreadyBooked) {
            throw new ErrorClass(
                'Booking failed, you already have a booking for the given date',
                409
            );
        }

        const isFacilityAdmin = await FacilityAdminModel.findOne({
            empId,
            $or: [
                { isSuperAdmin: true },
                {
                    assignedPractices: practice,
                    roles: FACILITY_ADMIN_ROLES.BOOK_VISIT_APPROVER,
                },
            ],
        });
        const newVisitBooking = { ...req.body };
        newVisitBooking.empId = empId;
        newVisitBooking.bookedByName = name;
        newVisitBooking.date = bookingDate;
        newVisitBooking.currentStatus = VISIT_REQ_STATUS.PENDING;
        if (isFacilityAdmin || EXTRA_PRACTICES.includes(practice)) {
            newVisitBooking.currentStatus = VISIT_REQ_STATUS.APPROVED;
        }
        newVisitBooking.requestId = await getRequestId('visitrequestid');
        await new VisitBooking(newVisitBooking).save();

        res.status(200).send({
            status: 200,
            data: {
                message: 'Booking request submitted successfully',
                requestId: newVisitBooking.requestId,
            },
        });
        const concernedEmpInfo = await getEmpDetail(concernedEmpId);
        const summary = requestSummary.length
            ? ` due to <b>${requestSummary}</b>.`
            : '.';

        if (newVisitBooking.currentStatus === VISIT_REQ_STATUS.APPROVED) {
            const empInfo = await getEmpDetail(empId);

            const mailMessage = `<p>Hello,</p><p><b>${name}</b> has successfully booked a visit to meet <b>${concernedEmpInfo.name}(${concernedEmpId})</b>${summary}</p> ${MAIL_FOOTER}`;
            if (empInfo.mail) {
                const mailOptions = {
                    to: [concernedEmpInfo.mail, empInfo.mail],
                    cc: CATEGORY_EMAILS[category],
                    subject: `${capitalizeAction(
                        VISIT_REQ_STATUS.APPROVED
                    )}: Visit Request by ${name}, ${empId.toUpperCase()} on ${moment(
                        bookingDate
                    ).format('LL')}`,
                    html: mailMessage,
                };
                await sendMailToEmployee(mailOptions);
            }
        } else {
            const facilityAdminsDetails = await FacilityAdminModel.find({
                $or: [
                    { isSuperAdmin: true },
                    {
                        assignedPractices: practice,
                        roles: FACILITY_ADMIN_ROLES.BOOK_VISIT_APPROVER,
                    },
                ],
            }).select('-_id email');
            const emails = arrayOfEmails(facilityAdminsDetails);
            if (emails.length) {
                const employeeId = empId.toUpperCase();
                const mailMessage = `<p>Hello,</p><p>A visit request <b>#${newVisitBooking.requestId}</b> from <b>${name}, ${employeeId}</b> to meet <b>${concernedEmpInfo.name}(${concernedEmpId})</b> is waiting for your approval.</p>${MAIL_FOOTER}`;
                const mailOptions = {
                    to: emails,
                    subject: `Pending Visit Booking Request: ${name}, ${employeeId}`,
                    html: mailMessage,
                };
                await sendMailToEmployee(mailOptions);
            }
        }
    } catch (error) {
        next(error);
    }
};

exports.getVisitBooking = async (req, res, next) => {
    try {
        const isInvalidRequest = validateRequest(req.query, {
            requesterId: true,
            currentStatus: false,
            date: false,
            offset: false,
            filter: false,
            limit: false,
            orderBy: false,
            sortOrder: false,
        });
        if (isInvalidRequest) {
            throw new ErrorClass('Invalid query parameters', 400);
        }

        checkPaginationParams(req);

        const queryObject = {
            empId: req.emp.empId.toLowerCase(),
        };

        if (req.query.currentStatus) {
            queryObject.currentStatus = req.query.currentStatus;
        }

        if (req.query.date) {
            queryObject.date = filterDate(req.query.date);
        } else {
            queryObject.date = { $gte: VISIT_MIN_DATE };
        }

        const { sortObject, inValidSortingParams } = getSortingObject(req);
        if (inValidSortingParams) {
            throw new ErrorClass('Invalid sorting parameters', 400);
        }

        const bookingDetails = await VisitBooking.find(queryObject)
            .sort(sortObject)
            .select(['-_id', '-__v']);

        if (!bookingDetails || !bookingDetails.length) {
            res.status(200).send({
                status: 200,
                data: [],
                message: 'No data found!',
            });
        } else {
            const startValue = parseInt(req.query.offset);
            const endValue =
                parseInt(req.query.offset) + parseInt(req.query.limit);
            const totalBookingsCount = bookingDetails.length;
            const paginatedBookings = bookingDetails.slice(
                startValue,
                endValue
            );
            const paginationObject = getPaginationObject({
                limit: req.query.limit,
                offset: req.query.offset,
                total: totalBookingsCount,
                count: paginatedBookings.length,
            });
            res.status(200).send({
                status: 200,
                data: paginatedBookings,
                pagination: paginationObject,
            });
        }
    } catch (error) {
        next(error);
    }
};

exports.getPendingVisitBookings = async (req, res, next) => {
    try {
        const isInvalidRequest = validateRequest(req.query, {
            approverId: true,
            currentStatus: false,
            date: false,
            offset: false,
            filter: false,
            limit: false,
            orderBy: false,
            sortOrder: false,
        });
        if (isInvalidRequest) {
            throw new ErrorClass('Invalid query parameters', 400);
        }

        const { sortObject, inValidSortingParams } = getSortingObject(req);
        if (inValidSortingParams) {
            throw new ErrorClass('Invalid sorting parameters', 400);
        }

        const { empId } = req.emp;
        const filter = {};
        checkPaginationParams(req);

        const isFacilityAdmin = await validateFacilityAdmin(empId);
        if (
            !(
                isFacilityAdmin &&
                (isFacilityAdmin.isSuperAdmin ||
                    isVisitApprover(isFacilityAdmin))
            )
        ) {
            throw new ErrorClass(
                'You are not authorized to get visit booking pending requests.',
                403
            );
        }

        if (isFacilityAdmin) {
            filter.currentStatus = VISIT_REQ_STATUS.PENDING;
            if (!isFacilityAdmin.isSuperAdmin) {
                filter.practice = { $in: isFacilityAdmin.assignedPractices };
            }
        }

        //  fetch records for future dates if no date filter is set.
        filter.date = filterDate(req.query.date);

        const pendingRequests = await VisitBooking.find(filter)
            .sort(sortObject)
            .select(['-_id', '-__v']);

        if (!pendingRequests || !pendingRequests.length) {
            res.status(200).send({
                status: 200,
                data: [],
                message: 'No data found!',
            });
        } else {
            const startValue = parseInt(req.query.offset);
            const endValue =
                parseInt(req.query.offset) + parseInt(req.query.limit);
            const totalBookingsCount = pendingRequests.length;
            const paginatedBookings = pendingRequests.slice(
                startValue,
                endValue
            );
            const paginationObject = getPaginationObject({
                limit: req.query.limit,
                offset: req.query.offset,
                total: totalBookingsCount,
                count: paginatedBookings.length,
            });
            res.status(200).send({
                status: 200,
                data: paginatedBookings,
                pagination: paginationObject,
            });
        }
    } catch (error) {
        next(error);
    }
};

exports.actionOnVisitBooking = async (req, res, next) => {
    try {
        const isInvalidRequest = validateRequest(req.body, {
            requestId: true,
            action: true,
            rejectionReason: false,
        });
        if (isInvalidRequest) {
            throw new ErrorClass(
                'Booking request contains missing or Invalid data',
                400
            );
        }

        const { action, requestId, rejectionReason } = req.body;
        if (!Object.values(VISIT_REQ_STATUS).includes(action)) {
            throw new ErrorClass('Invalid action on request.', 400);
        }

        if (action === VISIT_REQ_STATUS.REJECTED && !req.body.rejectionReason) {
            throw new ErrorClass('Rejection reason is required.', 400);
        }

        const { empId } = req.emp;
        const isFacilityAdmin = await validateFacilityAdmin(empId);

        const searchFilter = { requestId: req.body.requestId };
        let status;
        const visitData = await VisitBooking.findOne({ requestId });
        if (!visitData) {
            throw new ErrorClass('booking request not found', 400);
        } else if (action === VISIT_REQ_STATUS.CANCELLED) {
            searchFilter.empId = empId;
            status = action;
        } else if (
            isFacilityAdmin &&
            (isFacilityAdmin.isSuperAdmin ||
                (isVisitApprover(isFacilityAdmin) &&
                    isFacilityAdmin.assignedPractices.includes(
                        visitData.practice
                    )))
        ) {
            searchFilter.currentStatus = VISIT_REQ_STATUS.PENDING;
            status =
                action === VISIT_REQ_STATUS.APPROVED
                    ? VISIT_REQ_STATUS.APPROVED
                    : VISIT_REQ_STATUS.REJECTED;
        } else {
            throw new ErrorClass(
                'You are not authorized to take action on this request.',
                403
            );
        }

        const visitBooking = await VisitBooking.findOne(searchFilter);
        if (!visitBooking) {
            throw new ErrorClass('booking request not found', 400);
        }

        const nonCancellableStatus = [
            VISIT_REQ_STATUS.REJECTED,
            VISIT_REQ_STATUS.CANCELLED,
        ];
        if (
            action === VISIT_REQ_STATUS.CANCELLED &&
            nonCancellableStatus.includes(visitBooking.currentStatus)
        ) {
            throw new ErrorClass(
                `Cannot cancel already ${action} bookings`,
                409
            );
        }

        const { actionedUponBy, currentStatus } = visitBooking;
        visitBooking.currentStatus = status;
        visitBooking.actionedUponBy = empId;
        await visitBooking.save();

        const approverInfo = await getEmpDetail(empId);
        const empInfo = await getEmpDetail(visitBooking.empId);

        let mailMessage = `<p>Hello ${empInfo.name},</p>`;
        if (action === VISIT_REQ_STATUS.APPROVED) {
            mailMessage += `<p>Your request <b>#${requestId}</b> to visit <b>${
                visitBooking.concernedEmpName
            }</b> on <b>${moment(visitBooking.date).format(
                'LL'
            )}</b> has been approved by the <b>${
                approverInfo.name
            }</b>. Your visit has been confirmed.</p>`;
        } else if (action === VISIT_REQ_STATUS.REJECTED) {
            mailMessage += `<p>Your request <b>#${requestId}</b> to visit <b>${
                visitBooking.concernedEmpName
            }</b> on <b>${moment(visitBooking.date).format(
                'LL'
            )}</b> has been rejected by the <b>${
                approverInfo.name
            }</b> for the following reason -</p><p>"${rejectionReason}"</p>`;
        } else if (action === VISIT_REQ_STATUS.CANCELLED) {
            mailMessage += `<p>Your request <b>#${requestId}</b> to visit <b>${
                visitBooking.concernedEmpName
            }</b> on <b>${moment(visitBooking.date).format(
                'LL'
            )}</b> has been marked as cancelled as per your wish. </b></p>`;
        }
        mailMessage += MAIL_FOOTER;

        const { category, requestSummary } = visitBooking;
        res.status(200).send({
            status: 200,
            message: `Request ${action}!`,
            requestId: visitBooking.requestId,
        });

        const concernedEmpInfo = await getEmpDetail(
            visitBooking.concernedEmpId
        );
        let mailOptions = '';
        if (empInfo.mail) {
            mailOptions = {
                to: empInfo.mail,
                subject: `${capitalizeAction(
                    action
                )}: Visit Request <b>#${requestId}</b> on ${moment(
                    visitBooking.date
                ).format('LL')}`,
                html: mailMessage,
            };
            await sendMailToEmployee(mailOptions);
        }
        if (action === VISIT_REQ_STATUS.APPROVED) {
            const summary = requestSummary.length ? `${requestSummary}` : '';
            mailMessage = `<p>Hello <b>${
                concernedEmpInfo.name
            }</b>,</p><p>The visit request raised by <b>${
                empInfo.name
            }</b> to visit you on <b>${moment(visitBooking.date).format(
                'LL'
            )}</b> for <b>${summary}</b> has been approved.</p> ${MAIL_FOOTER}`;
            if (concernedEmpInfo.mail) {
                mailOptions = {
                    to: concernedEmpInfo.mail,
                    cc: CATEGORY_EMAILS[category],
                    subject: `${capitalizeAction(action)}: Visit Request by ${
                        empInfo.name
                    }, ${visitBooking.empId.toUpperCase()} on ${moment(
                        visitBooking.date
                    ).format('LL')}`,
                    html: mailMessage,
                };
                await sendMailToEmployee(mailOptions);
            }
        }
        if (
            currentStatus === VISIT_REQ_STATUS.APPROVED &&
            action === VISIT_REQ_STATUS.CANCELLED
        ) {
            const actionedUponByInfo = await getEmpDetail(actionedUponBy);
            mailMessage = `<p>Hello,</p><p>The visit request raised by <b>${
                empInfo.name
            }, ${visitBooking.empId.toUpperCase()}</b> via the BookMySeat application has been marked as cancelled. The person will not be visiting <b>${
                concernedEmpInfo.name
            }</b> on <b>${moment(visitBooking.date).format(
                'LL'
            )}</b>. Please take note of this.</p> ${MAIL_FOOTER}`;
            if (actionedUponByInfo.mail || concernedEmpInfo.mail) {
                mailOptions = {
                    to: concernedEmpInfo.mail ? concernedEmpInfo.mail : '',
                    cc: actionedUponByInfo.mail ? actionedUponByInfo.mail : '',
                    subject: `${capitalizeAction(action)}: Visit Request by ${
                        empInfo.name
                    }, ${visitBooking.empId.toUpperCase()} for ${moment(
                        visitBooking.date
                    ).format('LL')}`,
                    html: mailMessage,
                };
                await sendMailToEmployee(mailOptions);
            }
        }
    } catch (error) {
        next(error);
    }
};

exports.getApprovedVisitSummary = async (req, res, next) => {
    try {
        const isFacilityAdmin = await validateFacilityAdmin(req.emp.empId);
        if (
            !isFacilityAdmin ||
            (isFacilityAdmin &&
                !isFacilityAdmin.isSuperAdmin &&
                !isVisitApprover(isFacilityAdmin))
        ) {
            throw new ErrorClass(
                'You are not authorized to get visits summary.',
                403
            );
        }

        const isInvalidRequest = validateRequest(req.query, {
            date: true,
        });
        if (isInvalidRequest) {
            throw new ErrorClass('ontains invalid query params', 400);
        }

        const filter = {
            currentStatus: VISIT_REQ_STATUS.APPROVED,
            date: formatDate(req.query.date),
        };
        const approvedVisitSummary = await VisitBooking.find(filter);
        res.status(200).send({
            status: '200',
            data: approvedVisitSummary,
        });
    } catch (error) {
        next(error);
    }
};

exports.downloadVisitBookings = async (req, res, next) => {
    try {
        const isFacilityAdmin = await validateFacilityAdmin(req.emp.empId);
        if (
            !isFacilityAdmin &&
            (!isFacilityAdmin.isSuperAdmin || !isVisitApprover(isFacilityAdmin))
        ) {
            throw new ErrorClass(
                'You are not authorized to download the booking reports',
                403
            );
        }

        const isValidRequest = validateRequest(req.query, {
            date: true,
        });

        if (isValidRequest) {
            throw new ErrorClass('Contains invalid query params', 400);
        }

        const date = formatDate(req.query.date);
        const filter = {
            currentStatus: VISIT_REQ_STATUS.APPROVED,
            date,
        };
        const visitBookingsDetails = await VisitBooking.find(filter);
        if (!visitBookingsDetails.length) {
            throw new ErrorClass('No bookings found', 400);
        }

        const bookings = [];
        let index = 1;
        visitBookingsDetails.forEach((booking) => {
            bookings.push({
                index,
                empId: booking.empId,
                category: booking.category,
                concernedEmpName: booking.concernedEmpName,
                requestSummary: booking.requestSummary,
                vaccinationStatus: booking.vaccinationStatus
                    ? VACCINATION_STATUS.DONE
                    : VACCINATION_STATUS.PENDING,
            });
            index++;
        });

        if (!bookings.length) {
            throw new ErrorClass('No bookings found', 400);
        }

        const workbook = new excel.Workbook();
        const worksheet = workbook.addWorksheet('Report');

        const header = ['Visit report'];
        const timeDetails = [
            `DATE - ${moment(req.query.date, DATE_FORMAT).format('LL')}`,
            '',
            `Generated at - ${moment(new Date())
                .utcOffset(330)
                .format('LLLL')}`,
            '',
            '',
        ];

        const titleFont = {
            name: 'serif',
            size: 30,
            bold: true,
        };
        worksheet.addRow(header);
        worksheet.addRow(timeDetails);
        worksheet.getCell('A1').font = titleFont;
        worksheet.getCell('C1').font = titleFont;
        worksheet.mergeCells('A1:B1');
        worksheet.mergeCells('C1:E1');
        worksheet.mergeCells('A2:B2');
        worksheet.mergeCells('C2:E2');
        worksheet.properties.defaultColWidth = 25;

        worksheet.addRow([
            'S.No',
            'Emp Id',
            'Category',
            'Concerned Person Name',
            'Summary',
            'Vaccination Status',
        ]);

        ['A3', 'B3', 'C3', 'D3', 'E3', 'F3'].forEach((col) => {
            worksheet.getCell(col).font = {
                name: 'serif',
                size: 20,
                bold: true,
            };
        });

        bookings.forEach((booking) => {
            worksheet.addRow(Object.values(booking));
        });

        res.status(200);
        res.setHeader('Content-Type', 'text/xlsx');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="Visit-Bookings-(${moment(
                req.query.date
            ).format('LL')}).xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        next(error);
    }
};

function validateDates(date) {
    if (moment(date).isAfter(moment().add(ALLOWED_MAX_FUTURE_DAYS, 'd'))) {
        throw new ErrorClass(
            `Cannot book beyond ${ALLOWED_MAX_FUTURE_DAYS}  days from today.`,
            400
        );
    }
    if (date < formatDate(moment().format('DD-MM-YYYY'))) {
        throw new ErrorClass('Cannot book past date.', 400);
    }
}

function capitalizeAction(action) {
    return action.charAt(0).toUpperCase() + action.slice(1);
}
