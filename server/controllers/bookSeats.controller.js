const moment = require('moment');
const excel = require('exceljs');
const NewBooking = require('../models/newBooking.model');
const FacilityAdminModel = require('../models/facilityAdmin.model');
const { FloorPlan } = require('../models/floorPlan.model');
const {
    sendMail,
    sendMailToEmployee,
} = require('../services/mailer.util.service');
const adUtilService = require('../services/ad.util.service');
const ErrorClass = require('../services/error.service');
const BookedSeats = require('../models/bookedSeats.model');

const {
    SEAT_STATUS,
    L1_REQUIRED,
    REQUEST_STATUS,
    REQUIRED_NEW_BOOKING_PAYLOAD,
    APPROVAL_LEVEL,
    ALLOWED_MAX_FUTURE_DAYS,
    REQUEST_ACTION,
    VACCINATION_STATUS,
    DATE_FORMAT,
    MAIL_FOOTER,
    FACILITY_ADMIN_ROLES,
    EXTRA_PRACTICES,
} = require('../constants/constants');
const {
    checkPaginationParams,
    getSortingObject,
    validateRequest,
    formatDate,
    getRequestId,
    getPaginationObject,
    validateFacilityAdmin,
    filterDate,
    isSeatApprover,
    arrayOfEmails,
    currentDate,
    messageOnDates,
    getFloorPlan,
} = require('../services/common.util.service');

exports.newBooking = async (req, res, next) => {
    const seatNos = req.body.selectedSeats.map((seat) => seat.seatNo);
    const seatIds = [];
    try {
        const requiredAttributes = REQUIRED_NEW_BOOKING_PAYLOAD;
        const isInvalidRequest = validateRequest(req.body, requiredAttributes);
        if (isInvalidRequest || !req.body.selectedSeats.length) {
            throw new ErrorClass(
                'Invalid request. Contains invalid or missing data',
                400
            );
        }
        const {
            facilityId,
            practice,
            floorNo,
            facilityName,
            fromDate,
            toDate,
            L1Approver,
            bookedByName,
            selectedSeats,
            vaccinationStatus,
            requestSummary,
        } = req.body;

        const { empId } = req.emp;

        const fDate = formatDate(fromDate);
        const tDate = formatDate(toDate);
        const bookingDates = [];
        for (
            let m = moment(fDate);
            m.diff(moment(tDate), 'days') <= 0;
            m.add(1, 'days')
        ) {
            bookingDates.push(formatDate(m));
        }
        const floorPlan = await FloorPlan.findOne({ facilityId, floorNo });
        const self = await adUtilService.getEmpDetail(req.emp.empId);
        const isFacilityAdmin = await FacilityAdminModel.findOne({
            empId,
            $or: [
                { isSuperAdmin: true },
                {
                    assignedPractices: practice,
                    roles: FACILITY_ADMIN_ROLES.BOOK_SEAT_APPROVER,
                },
            ],
        });

        if (
            !isFacilityAdmin &&
            self.ou !== floorPlan.assignedPractice &&
            !EXTRA_PRACTICES.includes(self.ou)
        ) {
            throw new ErrorClass(
                `You are not authorized to raise a booking request for floor ${floorPlan.floorNo}`,
                400
            );
        }

        const subOrdinateIds = await getSubOrdinateIdsList(self);

        if (
            !isFacilityAdmin &&
            !isBookingForSubOrdinates(empId, selectedSeats, subOrdinateIds)
        ) {
            throw new ErrorClass(
                'You are not authorized to book seat(s) for the selected person(s)',
                403
            );
        }

        bookingDates.forEach((bookingDate) => {
            const allSeats = floorPlan.listingData.find(
                (listData) =>
                    listData.listingDate.toISOString() ===
                    bookingDate.toISOString()
            ).seats;
            allSeats.forEach((seat) => {
                if (seatNos.includes(seat.seatNo)) {
                    seatIds.push(seat.seatId);
                }
            });
        });
        await Promise.all(
            seatIds.map(async (seatId) => {
                await BookedSeats.create({ seatId });
            })
        );

        if (moment(fDate).isAfter(moment().add(ALLOWED_MAX_FUTURE_DAYS, 'd'))) {
            throw new ErrorClass(
                `Cannot book seat beyond ${ALLOWED_MAX_FUTURE_DAYS}  days from today.`,
                400
            );
        }

        if (moment(fDate).isSameOrAfter(floorPlan.indefiniteBlockingFromDate)) {
            throw new ErrorClass(
                'Booking failed. Facility is blocked for the selected date.',
                400
            );
        }
        bookingDates.forEach((bookingDate) => {
            const isNotAvailableForBooking = floorPlan.listingData.find(
                (listData) =>
                    listData.listingDate.toISOString() ===
                        bookingDate.toISOString() &&
                    listData.isFloorAvailableForBooking === false
            );

            if (isNotAvailableForBooking) {
                throw new ErrorClass(
                    `Booking failed. Facility is blocked for the date ${moment(
                        bookingDate
                    ).format('LL')}.`,
                    400
                );
            }
        });

        const newBooking = {
            ...req.body,
        };
        newBooking.fromDate = fDate;
        newBooking.toDate = tDate;

        let isL1ApproverFacilityAdmin = null;
        if (!isFacilityAdmin) {
            isL1ApproverFacilityAdmin = await FacilityAdminModel.findOne({
                empId: L1Approver,
                assignedPractices: practice,
                roles: FACILITY_ADMIN_ROLES.BOOK_SEAT_APPROVER,
            });
        }
        let message = 'Seats blocked and sent for approval successfully';
        if (isFacilityAdmin || EXTRA_PRACTICES.includes(self.ou)) {
            newBooking.currentStatus = REQUEST_STATUS.APPROVED;
            newBooking.actionedUponBy = empId;
            message = 'Seat(s) booked successfully';
        } else if (isL1ApproverFacilityAdmin) {
            newBooking.currentStatus = REQUEST_STATUS.PENDING_L2;
        } else {
            const isL1Required = L1_REQUIRED.includes(self.title);
            if (isL1Required) {
                if (!L1Approver) {
                    throw new ErrorClass(
                        'L1Approver details missing for logged in user',
                        400
                    );
                }
                newBooking.L1Approver = L1Approver.toLowerCase();
                requiredAttributes.L1Approver = true;
                newBooking.currentStatus = REQUEST_STATUS.PENDING_L1;
                newBooking.isL1Required = true;
            }
        }

        const floorPlans = await FloorPlan.find({
            assignedPractice: practice,
        });

        let fetchedFloorPlanDoc = [];
        floorPlans.forEach((singleFloorPlan) => {
            let listingData;
            const floorListingDataArray = singleFloorPlan._doc.listingData.map(
                (listing) => listing._doc
            );
            fetchedFloorPlanDoc = floorPlans.find(
                (singlefloorPlan) => singlefloorPlan.floorNo === floorNo
            );
            bookingDates.forEach((bookingDate) => {
                const queriedDateIndex = floorListingDataArray.findIndex(
                    (listData) =>
                        listData.listingDate.toString() ===
                        bookingDate.toString()
                );
                if (queriedDateIndex >= 0) {
                    const listingDataObject =
                        floorListingDataArray[queriedDateIndex];
                    if (floorNo === singleFloorPlan._doc.floorNo) {
                        listingData =
                            fetchedFloorPlanDoc.listingData[queriedDateIndex];
                        if (
                            listingData.availableSeatsCount <
                            selectedSeats.length
                        ) {
                            throw new ErrorClass(
                                `Required number of seats are not available for booking for the date ${moment(
                                    bookingDate
                                ).format('LL')}.`,
                                409
                            );
                        }
                    }
                    selectedSeats.forEach((seat) => {
                        const duplicate = listingDataObject.seats.find(
                            (s) =>
                                seat.bookedFor &&
                                s.bookedFor &&
                                seat.bookedFor.toLowerCase() ===
                                    s.bookedFor.toLowerCase()
                        );
                        // To check for duplicate bookings for the same employee on same day in different floors
                        if (duplicate) {
                            throw new ErrorClass(
                                `Booking failed. Seat already booked for ${
                                    duplicate.bookedForName
                                } in floor ${
                                    singleFloorPlan.floorNo
                                } for date ${moment(bookingDate).format(
                                    'LL'
                                )}. Please retry booking without duplicates.`,
                                409
                            );
                        }
                    });
                }
            });
        });

        bookingDates.forEach((bookingDate) => {
            let listingData;
            const updatedSeats = [];
            const queriedDateIndex =
                fetchedFloorPlanDoc._doc.listingData.findIndex(
                    (listData) =>
                        listData._doc.listingDate.toString() ===
                        bookingDate.toString()
                );
            if (queriedDateIndex >= 0) {
                listingData =
                    fetchedFloorPlanDoc._doc.listingData[queriedDateIndex];
                selectedSeats.forEach((seat) => {
                    const selectedSeatFound = listingData.seats.find(
                        (floorSeat) =>
                            floorSeat.seatNo === seat.seatNo &&
                            floorSeat.status === SEAT_STATUS.AVAILABLE &&
                            !floorSeat.socialDistancingEnabled
                    );
                    if (!selectedSeatFound) {
                        throw new ErrorClass(
                            `Requested seat (${
                                seat.seatNo
                            }) is not available for booking for date ${moment(
                                bookingDate
                            ).format(
                                'LL'
                            )}. Please verify the seats availability before booking`,
                            409
                        );
                    }
                    if (isFacilityAdmin || EXTRA_PRACTICES.includes(self.ou)) {
                        selectedSeatFound.status = SEAT_STATUS.BOOKED;
                    } else {
                        selectedSeatFound.status = SEAT_STATUS.BLOCKED;
                    }
                    selectedSeatFound.bookedFor = seat.bookedFor || '';
                    selectedSeatFound.bookedForName = seat.bookedForName;
                    selectedSeatFound.bookedBy = empId;
                    selectedSeatFound.bookedByName = bookedByName;
                    selectedSeatFound.bookedFrom = fDate;
                    selectedSeatFound.bookedTo = tDate;
                    updatedSeats.push(selectedSeatFound);
                });
            }
            updatedSeats.forEach((seat) => {
                let seatFound = listingData.seats.find(
                    (s) => seat.seatNo === s.seatNo
                );
                if (seatFound) {
                    seatFound = seat;
                }
            });
            const blockedSeatsCount = listingData.seats.filter(
                (s) => s.status === SEAT_STATUS.BLOCKED
            ).length;
            const bookedSeatsCount = listingData.seats.filter(
                (s) => s.status === SEAT_STATUS.BOOKED
            ).length;
            const unavailableSeatsCount = listingData.seats.filter(
                (s) => s.socialDistancingEnabled
            ).length;

            listingData.availableSeatsCount =
                listingData.totalSeatsCount -
                unavailableSeatsCount -
                blockedSeatsCount -
                bookedSeatsCount;
            listingData.bookedSeatsCount = bookedSeatsCount;
            listingData.blockedSeatsCount = blockedSeatsCount;
        });
        newBooking.requestId = await getRequestId('requestid');
        newBooking.vaccinationStatus = vaccinationStatus;
        await new NewBooking(newBooking).save();
        await fetchedFloorPlanDoc.save();

        res.status(200).send({
            status: 200,
            data: {
                message,
                requestId: newBooking.requestId,
            },
        });

        const otherMails = [];
        const allSeatNos = [];
        let mailOptions = '';
        if (isFacilityAdmin || EXTRA_PRACTICES.includes(self.ou)) {
            await Promise.all(
                selectedSeats.map(async (seat) => {
                    const user = await adUtilService.getEmpDetail(
                        seat.bookedFor
                    );
                    if (user.mail) {
                        if (user.mail === self.mail) {
                            mailOptions = {
                                to: self.mail,
                                subject: `Seat allotment is successsful for ${
                                    seat.seatNo
                                }, ${messageOnDates(fDate, tDate)} `,
                                html: `<p>Hello <b>${
                                    self.name
                                }</b>,<p>Seat allotment for ${
                                    seat.seatNo
                                },${floorNo}, ${facilityName} ${messageOnDates(
                                    fDate,
                                    tDate
                                )} is successful.</p> ${MAIL_FOOTER}`,
                            };
                            sendMailToEmployee(mailOptions);
                        } else {
                            otherMails.push(user.mail);
                            allSeatNos.push({
                                empId: seat.bookedFor,
                                seatNo: seat.seatNo,
                            });
                        }
                    }
                })
            );

            if (otherMails.length) {
                sendMailsToOtherEmployees(req, selectedSeats, otherMails);
            }
        } else if (
            isL1ApproverFacilityAdmin ||
            !L1_REQUIRED.includes(self.title)
        ) {
            const faEmails = await FacilityAdminModel.find({
                $or: [
                    { isSuperAdmin: true },
                    {
                        assignedPractices: practice,
                        roles: FACILITY_ADMIN_ROLES.BOOK_SEAT_APPROVER,
                    },
                ],
            }).select('-_id email');
            const emails = arrayOfEmails(faEmails);
            if (emails.length) {
                const mailMessage = `<p>Hello,</p><p>Seat booking request by <b>${bookedByName}(${empId.toUpperCase()})</b> ${messageOnDates(
                    fDate,
                    tDate
                )} is waiting for your approval, for the below mentioned reason - </br> <p> <b>${requestSummary}. </b> </p> You may approve or reject this request via the BookMySeat application.</p> ${MAIL_FOOTER}`;
                mailOptions = {
                    to: emails,
                    subject: `Pending Seat Booking Request: ${bookedByName}, ${empId.toUpperCase()} for your approval`,
                    html: mailMessage,
                };
                await sendMailToEmployee(mailOptions);
            }
        } else {
            const empInfo = await adUtilService.getEmpDetail(L1Approver);
            if (empInfo.mail) {
                const mailMessage = `<p>Hello ${
                    empInfo.name
                },</p><p>You have received a seat booking request from <b>${bookedByName}(${empId.toUpperCase()})</b> ${messageOnDates(
                    fDate,
                    tDate
                )}</b> with the following comments/reason - </br> <p> <b>${requestSummary}. </b> </p> You may approve or reject this request via the BookMySeat application.</p> ${MAIL_FOOTER}`;
                mailOptions = {
                    to: empInfo.mail,
                    subject: `Pending Seat Booking Request: ${bookedByName}, ${empId.toUpperCase()}`,
                    html: mailMessage,
                };
                await sendMailToEmployee(mailOptions);
            }
        }
    } catch (error) {
        next(error);
    }
};

async function getSubOrdinateIdsList(self) {
    const employeeDetails = { subordinates: [] };
    await adUtilService.getSubordinates(employeeDetails, self);
    employeeDetails.subordinates = employeeDetails.subordinates.map((emp) => {
        return {
            name: emp.name,
            empId: emp.sAMAccountName,
            email: emp.mail,
        };
    });

    const subOrdinateIds = [];
    employeeDetails.subordinates.forEach((subOrdinate) => {
        subOrdinateIds.push(subOrdinate.empId.toLowerCase());
    });
    return subOrdinateIds;
}

function isBookingForSubOrdinates(empId, selectedSeats, subOrdsList) {
    let flag = true;
    selectedSeats.forEach((selectedSeat) => {
        if (
            selectedSeat.bookedFor.toLowerCase() !== empId &&
            !subOrdsList.includes(selectedSeat.bookedFor.toLowerCase())
        ) {
            flag = false;
        }
    });
    return flag;
}

exports.getBooking = async (req, res, next) => {
    try {
        const isInvalidRequest = validateRequest(req.query, {
            requestId: true,
        });

        if (isInvalidRequest) {
            throw new ErrorClass('Invalid query parameters', 400);
        }

        const bookingDetails = await NewBooking.findOne({
            requestId: req.query.requestId,
        }).select(['-_id', '-__v']);

        if (!bookingDetails) {
            res.status(200).send({
                status: 200,
                data: [],
                message: 'No data found!',
            });
        } else {
            res.status(200).send({
                status: 200,
                data: bookingDetails,
            });
        }
    } catch (error) {
        next(error);
    }
};

exports.getBookings = async (req, res, next) => {
    try {
        const isInvalidRequest = validateRequest(req.query, {
            requesterId: true,
            currentStatus: false,
            fromDate: false,
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

        let queryObject = {
            empId: req.emp.empId.toLowerCase(),
        };

        if (req.query.currentStatus) {
            queryObject.currentStatus = req.query.currentStatus;
        }

        const { fromDate } = req.query;

        if (fromDate) {
            const localDate = formatDate(fromDate);
            queryObject = {
                fromDate: { $lte: localDate },
                toDate: { $gte: localDate },
                ...queryObject,
            };
        }

        const { sortObject, inValidSortingParams } = getSortingObject(req);
        if (inValidSortingParams) {
            throw new ErrorClass('Invalid sorting parameters', 400);
        }

        const bookingDetails = await NewBooking.find(queryObject)
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

exports.getPendingApprovalBookings = async (req, res, next) => {
    try {
        let filter = {};

        const isInvalidRequest = validateRequest(req.query, {
            approverId: false,
            date: false,
            offset: false,
            limit: false,
            orderBy: false,
            sortOrder: false,
        });

        checkPaginationParams(req);

        const { sortObject, inValidSortingParams } = getSortingObject(req);
        if (inValidSortingParams || isInvalidRequest) {
            throw new ErrorClass('Invalid query parameters', 400);
        }

        const { empId } = req.emp;
        const isFacilityAdmin = await validateFacilityAdmin(empId);

        const self = await adUtilService.getEmpDetail(empId);

        const subOrdinateIdsList = await getSubOrdinateIdsList(self);

        if (!isFacilityAdmin && !subOrdinateIdsList.length) {
            throw new ErrorClass(
                'You are not authorized to get seat booking pending requests',
                403
            );
        }
        if (
            isFacilityAdmin &&
            (isFacilityAdmin.isSuperAdmin || isSeatApprover(isFacilityAdmin))
        ) {
            filter.currentStatus = REQUEST_STATUS.PENDING_L2;
            if (!isFacilityAdmin.isSuperAdmin) {
                filter.practice = {
                    $in: isFacilityAdmin.assignedPractices,
                };
            }
        } else {
            filter = {
                L1Approver: req.query.approverId.toLowerCase(),
                currentStatus: REQUEST_STATUS.PENDING_L1,
            };
        }
        //  fetch records for future dates if no date filter is set.
        filter.toDate = filterDate(req.query.date);

        if (
            req.emp.empId.toLowerCase() !== req.query.approverId.toLowerCase()
        ) {
            throw new ErrorClass('please send correct approverId', 400);
        }

        let bookingDetails;
        if (req.emp.isSuperAdmin) {
            let filterStatus = [];

            filterStatus = {
                $or: [
                    { currentStatus: REQUEST_STATUS.PENDING_L2 },
                    { currentStatus: REQUEST_STATUS.PENDING_L1 },
                ],
            };

            bookingDetails = await NewBooking.find(filterStatus).sort(
                sortObject
            );
        } else {
            bookingDetails = await NewBooking.find(filter).sort(sortObject);
        }

        const startValue = parseInt(req.query.offset);
        const endValue = parseInt(req.query.offset) + parseInt(req.query.limit);
        const totalBookingsCount = bookingDetails.length;
        const paginatedBookings = bookingDetails.slice(startValue, endValue);
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
    } catch (error) {
        next(error);
    }
};

const createMailMetaData = async (rejectionLevel, requestDetails) => {
    const requester = await adUtilService.getEmpDetail(requestDetails.empId);
    const beneficiariesEmailList = [];
    let isBulkBooking = false;
    if (requestDetails.selectedSeats.length > 1) {
        isBulkBooking = true;
        for (const seat of requestDetails.selectedSeats) {
            beneficiariesEmailList.push(
                // add only mail
                // eslint-disable-next-line no-await-in-loop
                (await adUtilService.getEmpDetail(seat.bookedFor)).mail
            );
        }
    }

    if (isBulkBooking) {
        const beneficiariesCopyEmailList = beneficiariesEmailList.filter(
            (email) => email !== requester.mail
        );
        return {
            ...requestDetails._doc,
            to: [requester.mail],
            cc: rejectionLevel ? [] : beneficiariesCopyEmailList,
            rejectionLevel,
            empName: requestDetails.empId,
            seatNo: null,
            selectedSeats: [...requestDetails.selectedSeats],
        };
    }
    return {
        ...requestDetails._doc,
        to: [requester.mail],
        rejectionLevel,
        empName: requestDetails.selectedSeats[0].name,
        seatNo: requestDetails.selectedSeats[0].seatNo,
    };
};

exports.actionOnBookings = async (req, res, next) => {
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

        const { action } = req.body;
        if (!Object.values(REQUEST_ACTION).includes(action)) {
            throw new ErrorClass('Invalid action on request.', 400);
        }

        if (action === REQUEST_ACTION.REJECTED && !req.body.rejectionReason) {
            throw new ErrorClass('Rejection reason is required.', 400);
        }

        const empId = req.emp.empId.toLowerCase();
        const isFacilityAdmin = await validateFacilityAdmin(empId);

        const searchFilter = { requestId: req.body.requestId };
        let status;

        if (action === REQUEST_ACTION.CANCELLED) {
            searchFilter.empId = empId;
            status = action;
        } else if (
            isFacilityAdmin &&
            (isFacilityAdmin.isSuperAdmin || isSeatApprover(isFacilityAdmin))
        ) {
            searchFilter.currentStatus = REQUEST_STATUS.PENDING_L2;
            status =
                action === REQUEST_ACTION.APPROVED
                    ? REQUEST_STATUS.APPROVED
                    : REQUEST_STATUS.REJECTED_L2;
        } else {
            searchFilter.L1Approver = empId;
            searchFilter.currentStatus = REQUEST_STATUS.PENDING_L1;
            status =
                action === REQUEST_ACTION.APPROVED
                    ? REQUEST_STATUS.PENDING_L2
                    : REQUEST_STATUS.REJECTED_L1;
        }

        const booking = await NewBooking.findOne(searchFilter);
        if (!booking) {
            throw new ErrorClass('booking request not found', 400);
        }

        const nonCancellableStatus = [
            REQUEST_STATUS.REJECTED_L1,
            REQUEST_STATUS.REJECTED_L2,
            REQUEST_STATUS.CANCELLED,
            REQUEST_STATUS.AUTO_CANCELLED,
        ];
        if (
            action === REQUEST_ACTION.CANCELLED &&
            nonCancellableStatus.includes(booking.currentStatus)
        ) {
            throw new ErrorClass(
                `Cannot cancel already ${action} bookings`,
                409
            );
        }
        const bookingDates = [];
        const fromDate =
            moment(booking.fromDate) < moment(currentDate())
                ? moment(currentDate()).add(1, 'days')
                : moment(booking.fromDate);
        for (
            let m = fromDate;
            m.diff(moment(booking.toDate), 'days') <= 0;
            m.add(1, 'days')
        ) {
            bookingDates.push(formatDate(m));
        }

        let floorPlanDoc;
        const seatIds = [];
        await Promise.all(
            bookingDates.map(async (bookingDate) => {
                const floorPlanData = await getFloorPlan(
                    booking.floorId,
                    bookingDate
                );
                if (!floorPlanData) {
                    throw new ErrorClass(
                        'Malformed booking, missing floorId and/or date',
                        400
                    );
                }
                floorPlanDoc = floorPlanData;
            })
        );

        const { currentStatus } = booking;
        const listingDataArray = floorPlanDoc._doc.listingData.map(
            (listing) => listing._doc
        );

        bookingDates.forEach((bookingDate) => {
            const queriedDateIndex = listingDataArray.findIndex(
                (listData) =>
                    listData.listingDate.toString() === bookingDate.toString()
            );
            const listingData = floorPlanDoc.listingData[queriedDateIndex];
            booking.selectedSeats.forEach((seat) => {
                const seatFound = listingData.seats.find(
                    (s) => s.seatNo.toString() === seat.seatNo.toString()
                );
                if (!seatFound) {
                    throw new ErrorClass(
                        `Malformed booking, details for seat ${
                            seat.seatNo
                        } not found for date ${moment(bookingDate).format(
                            'LL'
                        )}`,
                        400
                    );
                }
                seatIds.push(seatFound.seatId);
                if (action !== REQUEST_ACTION.APPROVED) {
                    booking.rejectionReason = req.body.rejectionReason;
                    seatFound.bookedBy = '';
                    seatFound.bookedFor = '';
                    seatFound.bookedForName = '';
                    seatFound.bookedFrom = '';
                    seatFound.bookedTo = '';
                    seatFound.bookedByName = '';
                    if (!seatFound.socialDistancingEnabled) {
                        seatFound.status = SEAT_STATUS.AVAILABLE;
                    } else {
                        seatFound.status = SEAT_STATUS.UNAVAILABLE;
                    }
                } else if (
                    isFacilityAdmin &&
                    !booking.blockedDates
                        .toString()
                        .includes(bookingDate.toString())
                ) {
                    if (!seatFound.socialDistancingEnabled) {
                        seatFound.status = SEAT_STATUS.BOOKED;
                    } else {
                        seatFound.status = SEAT_STATUS.UNAVAILABLE;
                    }
                }
            });
            listingData.availableSeatsCount = listingData.seats.filter(
                (s) => s.status === SEAT_STATUS.AVAILABLE
            ).length;

            listingData.blockedSeatsCount = listingData.seats.filter(
                (s) => s.status === SEAT_STATUS.BLOCKED
            ).length;

            listingData.bookedSeatsCount = listingData.seats.filter(
                (s) => s.status === SEAT_STATUS.BOOKED
            ).length;
        });
        booking.currentStatus = status;
        booking.actionedUponBy = empId;
        if (
            action === REQUEST_ACTION.CANCELLED &&
            moment(booking.fromDate) < moment(currentDate())
        ) {
            booking.cancelledDates.addToSet(...bookingDates);
        }
        await floorPlanDoc.save();
        await booking.save();
        if (action !== REQUEST_ACTION.APPROVED) {
            await BookedSeats.deleteMany({
                seatId: { $in: seatIds },
            });
        }

        res.status(200).send({
            status: 200,
            message: `Request ${action}!`,
            requestId: booking.requestId,
        });

        if (action !== REQUEST_ACTION.CANCELLED) {
            if (
                [
                    REQUEST_STATUS.APPROVED,
                    REQUEST_STATUS.REJECTED_L1,
                    REQUEST_STATUS.REJECTED_L2,
                ].includes(status)
            ) {
                sendMails(booking, action, isFacilityAdmin);
            } else if (status === REQUEST_STATUS.PENDING_L2) {
                const query = {
                    $or: [
                        { isSuperAdmin: true },
                        {
                            assignedPractices: booking.practice,
                            roles: FACILITY_ADMIN_ROLES.BOOK_SEAT_APPROVER,
                        },
                    ],
                };
                const facilityAdminsEmails = await FacilityAdminModel.find(
                    query
                ).select('-_id email');
                const emails = arrayOfEmails(facilityAdminsEmails);
                if (emails.length) {
                    const mailOptions = {
                        to: emails,
                        subject: `Pending Seat Booking Request: ${
                            booking.bookedByName
                        }, ${booking.empId.toUpperCase()}.`,
                        html: `<p>Hello,</p><p>You have received a seat booking request from <b>${
                            booking.bookedByName
                        }(${booking.empId.toUpperCase()})</b> ${messageOnDates(
                            booking.fromDate,
                            booking.toDate
                        )}. for the below mentioned reason - </br> <p> <b>${
                            booking.requestSummary
                        }. </b> </p> You may approve or reject this request via the BookMySeat application. </p> ${MAIL_FOOTER}`,
                    };
                    await sendMailToEmployee(mailOptions);
                }
            }
        } else if (action === REQUEST_ACTION.CANCELLED) {
            if (currentStatus === REQUEST_STATUS.APPROVED) {
                const self = await adUtilService.getEmpDetail(booking.empId);
                const otherMails = [];
                await Promise.all(
                    booking.selectedSeats.map(async (seat) => {
                        const user = await adUtilService.getEmpDetail(
                            seat.bookedFor
                        );
                        if (user.mail && self.mail !== user.mail) {
                            otherMails.push(user.mail);
                        }
                    })
                );
                if (self.mail) {
                    const mailOptionsSelf = {
                        to: self.mail,
                        subject: 'Seat booking request cancelled',
                        html: `<p>Hello, ${
                            self.name
                        }</p><p>Seat(s) booked ${messageOnDates(
                            booking.fromDate,
                            booking.toDate
                        )} is/are cancelled.</p>${MAIL_FOOTER}`,
                    };
                    sendMailToEmployee(mailOptionsSelf);
                }

                if (otherMails.length) {
                    const mailOptionsBulk = {
                        to: otherMails,
                        subject: 'Seat booking request cancelled',
                        html: `<p>Hello,</p><p>Seat booked for you by  <b>${
                            booking.bookedByName
                        }</b> ${messageOnDates(
                            booking.fromDate,
                            booking.toDate
                        )} is cancelled.</p>${MAIL_FOOTER}`,
                    };
                    sendMailToEmployee(mailOptionsBulk);
                }
                const L1ApproverDetails = await adUtilService.getEmpDetail(
                    booking.L1Approver
                );
                if (L1ApproverDetails.mail) {
                    const mailOptionsSelf = {
                        to: L1ApproverDetails.mail,
                        subject: `Seat booking request cancelled: ${
                            booking.bookedByName
                        }, ${booking.empId.toUpperCase()}`,
                        html: `<p>Hello, ${L1ApproverDetails.name}</p><p><b>${
                            booking.bookedByName
                        }</b> has cancelled the seat booked ${messageOnDates(
                            booking.fromDate,
                            booking.toDate
                        )}.</p>${MAIL_FOOTER}`,
                    };
                    sendMailToEmployee(mailOptionsSelf);
                }
            } else if (currentStatus === REQUEST_STATUS.PENDING_L1) {
                const L1ApproverDetails = await adUtilService.getEmpDetail(
                    booking.L1Approver
                );
                if (L1ApproverDetails.mail) {
                    const mailOptionsSelf = {
                        to: L1ApproverDetails.mail,
                        subject: `Seat booking request is withdrawn by ${
                            booking.bookedByName
                        }, ${booking.empId.toUpperCase()}`,
                        html: `<p>Hello, ${L1ApproverDetails.name}</p><p><b>${
                            booking.bookedByName
                        }</b> has withdrawn the seat booking request ${messageOnDates(
                            booking.fromDate,
                            booking.toDate
                        )}.</p>${MAIL_FOOTER}`,
                    };
                    sendMailToEmployee(mailOptionsSelf);
                }
            } else if (currentStatus === REQUEST_STATUS.PENDING_L2) {
                const L1ApproverDetails = await adUtilService.getEmpDetail(
                    booking.L1Approver
                );
                const query = {
                    $or: [
                        { isSuperAdmin: true },
                        {
                            assignedPractices: booking.practice,
                            roles: FACILITY_ADMIN_ROLES.BOOK_SEAT_APPROVER,
                        },
                    ],
                };
                const facilityAdminsEmails = await FacilityAdminModel.find(
                    query
                ).select('-_id email');
                const emails = arrayOfEmails(facilityAdminsEmails);
                if (emails.length && L1ApproverDetails.mail) {
                    const mailOptions = {
                        to: [emails, L1ApproverDetails.mail],
                        subject: `Seat booking request is withdrawn: ${
                            booking.bookedByName
                        }, ${booking.empId.toUpperCase()}.`,
                        html: `<p>Hello,</p><p><b>${
                            booking.bookedByName
                        }</b> has been cancelled the seat booking ${messageOnDates(
                            booking.fromDate,
                            booking.toDate
                        )}.</p>${MAIL_FOOTER}`,
                    };
                    await sendMailToEmployee(mailOptions);
                }
            }
        }
    } catch (error) {
        next(error);
    }
};

function sendMailsToOtherEmployees(req, selectedSeats, otherMails) {
    const { floorNo, facilityName } = req.body;
    const { empId } = req.emp;
    let facilityAdminMailMessage = `<p>Hello team,</p><p><b>${
        req.emp.name
    }(${empId})</b> booked a seat for you on floor <b>${floorNo}, ${facilityName}</b> ${messageOnDates(
        formatDate(req.body.fromDate),
        formatDate(req.body.toDate)
    )}</p>`;
    facilityAdminMailMessage +=
        '<table style="border: 1px solid black;border-collapse: collapse;">' +
        '<thead style="background-color:#6186b3; color:white">' +
        '<th style="border: 1px solid black;border-collapse: collapse;padding: 15px;"> Employee Id </th>' +
        '<th style="border: 1px solid black;border-collapse: collapse;padding: 15px;"> Employee Name </th>' +
        '<th style="border: 1px solid black;border-collapse: collapse;padding: 15px;"> Seat Number </th>' +
        '</thead>';
    selectedSeats.forEach((seat) => {
        facilityAdminMailMessage += `<tr> 
                    <td style="border: 1px solid black;border-collapse: collapse;padding: 15px;"> 
                    ${seat.bookedFor.toUpperCase()}
                    </td> 
                    <td style="border: 1px solid black;border-collapse: collapse;padding: 15px;"> 
                    ${seat.bookedForName}
                    </td> 
                    <td style="border: 1px solid black;border-collapse: collapse;padding: 15px;">
                    ${seat.seatNo}
                    </td>
                    </tr>`;
    });

    facilityAdminMailMessage += `</table> ${MAIL_FOOTER}`;
    if (otherMails.length) {
        const mailOptions = {
            to: otherMails,
            subject: 'Seat booked for you',
            html: facilityAdminMailMessage,
        };
        sendMailToEmployee(mailOptions);
    }
}

async function sendMails(booking, action, isFacilityAdmin) {
    let rejectionLevel = '';
    if (action === REQUEST_ACTION.REJECTED) {
        rejectionLevel = isFacilityAdmin
            ? APPROVAL_LEVEL.L2
            : APPROVAL_LEVEL.L1;
    } else if (action === REQUEST_ACTION.APPROVED && isFacilityAdmin) {
        rejectionLevel = '';
    }

    const mailData = await createMailMetaData(rejectionLevel, booking);
    await sendMail(mailData);
}

exports.downloadBookings = async (req, res, next) => {
    try {
        const isFacilityAdmin = await validateFacilityAdmin(req.emp.empId);
        if (!isFacilityAdmin) {
            throw new ErrorClass(
                'You are not authorized to download the booking reports',
                403
            );
        }

        const isValidRequest = validateRequest(req.query, {
            facilityId: true,
            floorNo: true,
            bookingDate: true,
        });

        if (isValidRequest) {
            throw new ErrorClass('Contains invalid query params', 400);
        }

        const date = formatDate(req.query.bookingDate);
        const filter = {
            facilityId: req.query.facilityId,
            floorNo: req.query.floorNo,
            currentStatus: REQUEST_STATUS.APPROVED,
            fromDate: { $lte: date },
            toDate: { $gte: date },
            blockedDates: { $ne: date },
            cancelledDates: { $ne: date },
        };
        const bookingDetails = await NewBooking.find(filter);
        if (!bookingDetails.length) {
            throw new ErrorClass('No bookings found', 400);
        }

        const bookings = [];
        let index = 1;
        bookingDetails.forEach((booking) => {
            booking.selectedSeats.forEach((seat) => {
                bookings.push({
                    index,
                    empId: seat.bookedFor,
                    empName: seat.bookedForName,
                    seatNo: seat.seatNo,
                    requestSummary: booking.requestSummary,
                    vaccinationStatus: booking.vaccinationStatus
                        ? VACCINATION_STATUS.DONE
                        : VACCINATION_STATUS.PENDING,
                });
                index++;
            });
        });

        if (!bookings.length) {
            throw new ErrorClass('No bookings found', 400);
        }

        const workbook = new excel.Workbook();
        const worksheet = workbook.addWorksheet('Report');
        const header = [
            `Facility - ${req.query.facilityId}`,
            '',
            `Floor - ${req.query.floorNo}`,
            '',
            '',
        ];
        const timeDetails = [
            `DATE - ${moment(req.query.bookingDate, DATE_FORMAT).format('LL')}`,
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
            'Employee Name',
            'Seat No',
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
            `attachment; filename="${filter.facilityId}-Floor-${
                filter.floorNo
            }-(${moment(req.query.bookingDate).format('LL')}).xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        next(error);
    }
};
