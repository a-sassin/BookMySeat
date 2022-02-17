const mongoose = require('mongoose');
const moment = require('moment');
const commonUtilService = require('../services/common.util.service');
const { FloorPlan, ListingData } = require('../models/floorPlan.model');
const constants = require('../constants/constants');
const ErrorClass = require('../services/error.service');
const {
    validateFacilityAdmin,
    messageOnDates,
} = require('../services/common.util.service');
const NewBooking = require('../models/newBooking.model');
const FloorPlanListingDates = require('../models/floorListingDates.model');
const FloorMap = require('../models/floorMap.model');
const adUtilService = require('../services/ad.util.service');
const { sendMailToEmployee } = require('../services/mailer.util.service');
const FacilityAdmin = require('../models/facilityAdmin.model');

exports.createFloorMap = async (req, res, next) => {
    try {
        const isFacilityAdmin = await validateFacilityAdmin(req.emp.empId);
        if (!isFacilityAdmin) {
            throw new ErrorClass(
                'You are not authorized to create floor map',
                403
            );
        }

        const isInvalidRequest = commonUtilService.validateRequest(req.body, {
            floorNo: true,
            facilityName: true,
            facilityId: true,
            assignedPractices: true,
            totalSeatsCount: true,
            availableSeatsCount: true,
            seats: true,
        });

        if (isInvalidRequest) {
            throw new ErrorClass('Invalid params sent', 400);
        }

        const {
            totalSeatsCount,
            availableSeatsCount,
            seats,
            floorNo,
            facilityName,
            facilityId,
            assignedPractices,
        } = req.body;

        const newFloorMap = new FloorMap({
            totalSeatsCount,
            availableSeatsCount,
            floorNo,
            facilityName,
            facilityId,
            assignedPractices,
            createdBy: req.emp.empId,
            updatedBy: req.emp.empId,
            seats,
        });

        await newFloorMap.save();

        res.status(200).send({
            status: '200',
            message: 'Floor map created successfully',
        });
    } catch (err) {
        next(err);
    }
};

exports.updateFloorMap = async (req, res, next) => {
    try {
        const isFacilityAdmin = await validateFacilityAdmin(req.emp.empId);
        if (!isFacilityAdmin) {
            throw new ErrorClass(
                'You are not authorized to create floor map',
                403
            );
        }

        const isInvalidRequest = commonUtilService.validateRequest(req.body, {
            floorNo: true,
            facilityId: true,
            date: true,
            seatsToBeChanged: true,
            assignedPractices: false,
        });

        if (isInvalidRequest) {
            throw new ErrorClass('Invalid params sent', 400);
        }

        const { facilityId, floorNo } = req.body;

        const floorMapInfo = await FloorMap.findOne({ facilityId, floorNo });

        if (!floorMapInfo) {
            throw new ErrorClass('Floor map not found', 400);
        }

        if (req.body.date && req.body.seatsToBeChanged) {
            const { date, seatsToBeChanged } = req.body;
            const today = commonUtilService.formatDate(
                moment().format(constants.DATE_FORMAT)
            );

            const modifiedDate = commonUtilService.formatDate(date);
            if (modifiedDate < today) {
                throw new ErrorClass(
                    'Date provided should be greater than or equal to current date',
                    400
                );
            } else if (modifiedDate.toString() === today.toString()) {
                seatsToBeChanged.forEach((seat) => {
                    const findSeat = floorMapInfo.seats.find(
                        (floorMapSeats) => floorMapSeats.seatNo === seat.seatNo
                    );
                    if (!findSeat) {
                        throw new ErrorClass('Seat not found', 400);
                    }
                    if (findSeat.updatedDetails) {
                        findSeat.updatedDetails = null;
                    }
                    if (
                        findSeat.socialDistancingEnabled === true &&
                        seat.status === constants.SEAT_STATUS.AVAILABLE
                    ) {
                        floorMapInfo.availableSeatsCount++;
                        findSeat.socialDistancingEnabled = false;
                    } else if (
                        findSeat.socialDistancingEnabled === false &&
                        seat.status === constants.SEAT_STATUS.UNAVAILABLE
                    ) {
                        floorMapInfo.availableSeatsCount--;
                        findSeat.socialDistancingEnabled = true;
                    }
                });
            } else {
                seatsToBeChanged.forEach((seat) => {
                    const findSeat = floorMapInfo.seats.find(
                        (floorMapSeats) => floorMapSeats.seatNo === seat.seatNo
                    );
                    if (!findSeat) {
                        throw new ErrorClass(
                            `Seat ${seat.seatNo} not found`,
                            400
                        );
                    }
                    if (
                        findSeat.updatedDetails.date &&
                        findSeat.updatedDetails.date < modifiedDate &&
                        findSeat.updatedDetails.status ===
                            constants.SEAT_STATUS.UNAVAILABLE
                    ) {
                        throw new ErrorClass('Cannot update details', 400);
                    }
                    if (
                        (findSeat.socialDistancingEnabled === true &&
                            seat.status === constants.SEAT_STATUS.AVAILABLE) ||
                        (findSeat.socialDistancingEnabled === false &&
                            seat.status ===
                                constants.SEAT_STATUS.UNAVAILABLE) ||
                        findSeat.updatedDetails.date
                    ) {
                        findSeat.updatedDetails.date = modifiedDate;
                        findSeat.updatedDetails.status = seat.status;
                    }
                });
            }
            const floorPlanInfo = await FloorPlan.findOne({
                facilityId,
                floorNo,
            });
            floorPlanInfo.listingData.forEach((listingDatum) => {
                if (
                    commonUtilService.formatDate(listingDatum.listingDate) >=
                    modifiedDate
                ) {
                    seatsToBeChanged.forEach((seat) => {
                        const findSeat = listingDatum.seats.find(
                            (listingDatumSeat) =>
                                listingDatumSeat.seatNo === seat.seatNo
                        );
                        findSeat.status = seat.status;
                        findSeat.socialDistancingEnabled = !(
                            seat.status === constants.SEAT_STATUS.AVAILABLE
                        );
                        emptyListingDataBookingDetails(findSeat);
                    });
                    commonUtilService.modifyListingDataSeatCount(listingDatum);
                }
            });
            const allCancelledBookings = [];
            await Promise.all(
                seatsToBeChanged.map(async (seat) => {
                    if (seat.status === constants.SEAT_STATUS.UNAVAILABLE) {
                        const fetchBookings = await NewBooking.find({
                            currentStatus: constants.REQUEST_STATUS.APPROVED,
                            $or: [
                                { fromDate: { $lte: modifiedDate } },
                                { fromDate: { $gte: modifiedDate } },
                            ],
                            toDate: { $gte: modifiedDate },
                            selectedSeats: {
                                $elemMatch: {
                                    seatNo: seat.seatNo,
                                    $or: [
                                        {
                                            seatCancelledFrom: {
                                                $gt: modifiedDate,
                                            },
                                        },
                                        {
                                            seatCancelledFrom: null,
                                        },
                                    ],
                                },
                            },
                        });

                        if (fetchBookings.length) {
                            fetchBookings.forEach((fetchBooking) => {
                                if (
                                    !allCancelledBookings.some(
                                        (booking) =>
                                            booking.requestId ===
                                            fetchBooking.requestId
                                    )
                                ) {
                                    allCancelledBookings.push(fetchBooking);
                                }
                            });
                        }
                    }
                })
            );

            if (allCancelledBookings.length) {
                await Promise.all(
                    allCancelledBookings.map(async (cancelledBooking) => {
                        const newSelectedSeatsArray = [];
                        cancelledBooking.selectedSeats.forEach(
                            (selectedSeat) => {
                                const checkSeatCancelled =
                                    seatsToBeChanged.find(
                                        (seat) =>
                                            seat.seatNo ===
                                                selectedSeat.seatNo &&
                                            seat.status ===
                                                constants.SEAT_STATUS
                                                    .UNAVAILABLE
                                    );
                                if (checkSeatCancelled) {
                                    selectedSeat.seatCancelledFrom =
                                        cancelledBooking.fromDate >=
                                        modifiedDate
                                            ? cancelledBooking.fromDate
                                            : modifiedDate;
                                }
                                newSelectedSeatsArray.push(selectedSeat);
                            }
                        );

                        cancelledBooking.selectedSeats = newSelectedSeatsArray;

                        let flag = true;

                        cancelledBooking.selectedSeats.forEach(
                            (selectedSeat) => {
                                if (
                                    !selectedSeat.seatCancelledFrom ||
                                    (selectedSeat.seatCancelledFrom &&
                                        selectedSeat.seatCancelledFrom >
                                            cancelledBooking.fromDate)
                                ) {
                                    flag = false;
                                }
                            }
                        );

                        if (flag) {
                            cancelledBooking.currentStatus =
                                constants.REQUEST_STATUS.CANCELLED;
                        }
                        await cancelledBooking.save();

                        const self = await adUtilService.getEmpDetail(
                            cancelledBooking.empId
                        );
                        const otherMails = [];
                        await Promise.all(
                            cancelledBooking.selectedSeats.map(
                                async (selectedSeat) => {
                                    const selectedSeatUser =
                                        await adUtilService.getEmpDetail(
                                            selectedSeat.bookedFor
                                        );
                                    if (
                                        selectedSeatUser.mail &&
                                        self.mail !== selectedSeatUser.mail
                                    ) {
                                        otherMails.push(selectedSeatUser.mail);
                                    }
                                }
                            )
                        );
                        let subject, mailMessage;

                        if (
                            cancelledBooking.currentStatus ===
                            constants.REQUEST_STATUS.CANCELLED
                        ) {
                            subject =
                                'BMS Notification: Seat booking request cancelled';
                            mailMessage = `<p>Hello,<br><br>Your seat booking request with request id <b>${cancelledBooking.requestId}</b> has been cancelled due to blocking of seat(s)</p>${constants.MAIL_FOOTER}`;
                        } else {
                            subject = `BMS Notification: Seat(s) cancelled from Seat booking request ${cancelledBooking.requestId}`;
                            mailMessage = `<p>Hello,<br><br>Below mentioned seats from your seat booking request with request id <b>${cancelledBooking.requestId}</b> has been cancelled due to blocking of seat(s)</p>`;
                            mailMessage +=
                                '<table style="border: 1px solid black;border-collapse: collapse;">' +
                                '<thead style="background-color:#6186b3; color:white">' +
                                '<th style="border: 1px solid black;border-collapse: collapse;padding: 15px;"> Seat No(s) </th>' +
                                '<th style="border: 1px solid black;border-collapse: collapse;padding: 15px;"> Booked For </th>' +
                                '<th style="border: 1px solid black;border-collapse: collapse;padding: 15px;"> Cancelled From </th>' +
                                '</thead>';
                            cancelledBooking.selectedSeats.forEach(
                                (selectedSeat) => {
                                    if (selectedSeat.seatCancelledFrom) {
                                        mailMessage += `<tr>
                                    <td style="border: 1px solid black;border-collapse: collapse;padding: 15px;"> 
                    ${selectedSeat.seatNo}
                    </td> 
                    <td style="border: 1px solid black;border-collapse: collapse;padding: 15px;"> 
                    ${selectedSeat.bookedFor.toUpperCase()}
                    </td> 
                    
                    <td style="border: 1px solid black;border-collapse: collapse;padding: 15px;">
                    ${moment(selectedSeat.seatCancelledFrom).format(
                        constants.DATE_FORMAT
                    )}
                    </td>
                    </tr>`;
                                    }
                                }
                            );
                            mailMessage += `</table> ${constants.MAIL_FOOTER}`;
                        }

                        if (self.mail) {
                            const mailOptions = {
                                to: self.mail,
                                subject,
                                html: mailMessage,
                            };
                            sendMailToEmployee(mailOptions);
                        }
                        if (otherMails.length) {
                            const mailOptions = {
                                to: otherMails,
                                subject,
                                html: mailMessage,
                            };
                            sendMailToEmployee(mailOptions);
                        }
                    })
                );
            }
            await floorPlanInfo.save();
        }
        if (req.body.assignedPractices) {
            floorMapInfo.assignedPractices = req.body.assignedPractices;
        }

        floorMapInfo.updatedBy = req.emp.empId;

        await floorMapInfo.save();

        res.status(200).send({
            status: 200,
            message: 'Floor map updated successfully',
        });
    } catch (err) {
        next(err);
    }
};

exports.getFloorPlan = async (req, res, next) => {
    const selectedDates = [];
    const concatDates = [];
    try {
        let filter = {};
        const isInvalidRequest = commonUtilService.validateRequest(req.query, {
            floorNo: true,
            facilityId: true,
            fromDate: true,
            toDate: true,
        });

        if (isInvalidRequest) {
            throw new ErrorClass('Invalid query params', 400);
        }

        filter = { ...req.query };
        delete filter.fromDate;
        delete filter.toDate;

        const floorPlan = await FloorPlan.findOne(filter);
        if (!floorPlan) {
            throw new ErrorClass('Floor data not found!', 404);
        }
        const fromDate = commonUtilService.formatDate(req.query.fromDate);
        let toDate = commonUtilService.formatDate(req.query.toDate);
        if (fromDate > toDate) {
            throw new ErrorClass(
                'From date should be less than or equal to To Date',
                400
            );
        }
        toDate = moment(toDate);
        if (toDate.diff(moment(fromDate), 'days') > 14) {
            throw new ErrorClass(
                'Date range should be less than or equal to 15 days',
                400
            );
        }

        for (
            let m = moment(fromDate);
            m.diff(toDate, 'days') <= 0;
            m.add(1, 'days')
        ) {
            selectedDates.push(m.toDate());
            concatDates.push(
                `${req.query.facilityId}_${req.query.floorNo}-${m.toDate()}`
            );
        }
        let response;
        const originalFloorPlan = JSON.parse(JSON.stringify(floorPlan._doc));

        await Promise.all(
            selectedDates.map(async (date) => {
                const listingData = floorPlan._doc.listingData.find(
                    (listing) =>
                        listing._doc.listingDate.toString() === date.toString()
                );
                if (!listingData) {
                    await FloorPlanListingDates.create({
                        listingFloorDate: `${req.query.facilityId}_${req.query.floorNo}-${date}`,
                    });
                    const newListingData =
                        await commonUtilService.createListingData(
                            req.query.facilityId,
                            req.query.floorNo,
                            date,
                            true
                        );
                    await FloorPlan.updateOne(
                        { floorNo: req.query.floorNo },
                        { $push: { listingData: newListingData } }
                    );
                    if (date.toString() === fromDate.toString()) {
                        response = originalFloorPlan;
                        response.listingData = [newListingData];
                    }
                } else if (date.toString() === fromDate.toString()) {
                    response = originalFloorPlan;
                    response.listingData = [listingData];
                }
            })
        );
        res.status(200).send({ status: '200', data: response });
    } catch (error) {
        try {
            await FloorPlanListingDates.deleteMany({
                listingFloorDate: { $in: concatDates },
            });
        } catch (err) {
            next(error);
        }
        next(error);
    }
};

exports.newFloorPlan = async (req, res) => {
    const seats =
        req.body.listingData[0].seats &&
        req.body.listingData[0].seats.map((seat) => {
            return {
                seatNo: seat.seatNo,
                coordinates: seat.coordinates,
                socialDistancingEnabled: seat.socialDistancingEnabled,
                seatId: mongoose.Types.ObjectId(),
                bookedBy: '',
                bookedFrom: '',
                bookedTo: '',
                bookedFor: '',
            };
        });

    const newListingData = new ListingData({
        listingDate: commonUtilService.formatDate(
            req.body.listingData[0].listingDate
        ),
        totalSeatsCount: req.body.listingData[0].totalSeatsCount,
        availableSeatsCount: req.body.listingData[0].availableSeatsCount,
        blockedSeatsCount: 0,
        bookedSeatsCount: 0,
        isFloorAvailableForBooking:
            req.body.listingData[0].isFloorAvailableForBooking,
        seats: [],
    });

    newListingData.seats.push(...seats);

    const newFloor = new FloorPlan({
        floorId: mongoose.Types.ObjectId(),
        assignedPractice: req.body.assignedPractice,
        facilityName: req.body.facilityName,
        facilityId: req.body.facilityId,
        floorNo: req.body.floorNo,
        listingData: newListingData,
    });
    try {
        if (seats && newListingData && newFloor) {
            await newFloor.save();
            res.status(201).send({
                message: 'Floor plan saved successfully.',
            });
        } else {
            res.status(400).send({
                message: 'Please send all required values in the body.',
            });
        }
    } catch (error) {
        res.status(500).send({
            message: 'Something went wrong',
            error,
        });
    }
};

exports.getApprovedSeatsSummary = async (req, res, next) => {
    try {
        const isFacilityAdmin = await validateFacilityAdmin(req.emp.empId);
        if (
            !isFacilityAdmin ||
            (isFacilityAdmin &&
                !isFacilityAdmin.isSuperAdmin &&
                !commonUtilService.isSeatApprover(isFacilityAdmin))
        ) {
            throw new ErrorClass(
                'You are not authorized to get seats summary.',
                403
            );
        }

        const isInvalidRequest = commonUtilService.validateRequest(req.query, {
            facilityId: true,
            queryDate: true,
        });

        if (isInvalidRequest) {
            throw new ErrorClass('Invalid query params', 400);
        }

        const { facilityId } = req.query;
        if (!constants.SUPPORTED_FACILITIES.includes(facilityId)) {
            throw new ErrorClass('Invalid facilityId', 400);
        }

        const date = commonUtilService.formatDate(req.query.queryDate);

        const floorDetails = await FloorPlan.find({
            facilityId,
        });

        const facilityAdminInfo = await FacilityAdmin.findOne({
            empId: req.emp.empId,
        });

        const approvedSeatsSummary = [];

        floorDetails.forEach((eachFloor) => {
            if (
                facilityAdminInfo.isSuperAdmin || facilityAdminInfo.assignedPractices.includes(
                    eachFloor.assignedPractice
                )
            ) {
                const approvedSeatsSummaryDetails = {};
                approvedSeatsSummaryDetails.floorNo = eachFloor.floorNo;
                approvedSeatsSummaryDetails.totalSeatsCount = eachFloor
                    .listingData.length
                    ? eachFloor.listingData[0].totalSeatsCount
                    : 0;
                const matchingDateRecord = eachFloor.listingData.find(
                    (listingDataele) =>
                        listingDataele.listingDate.toISOString() ===
                        date.toISOString()
                );

                if (matchingDateRecord) {
                    approvedSeatsSummaryDetails.bookedSeatsCount =
                        matchingDateRecord.bookedSeatsCount;
                } else {
                    approvedSeatsSummaryDetails.bookedSeatsCount = 0;
                }
                approvedSeatsSummaryDetails.facilityId = facilityId;
                approvedSeatsSummary.push(approvedSeatsSummaryDetails);
            }
        });

        res.status(200).send({
            status: '200',
            data: approvedSeatsSummary,
        });
    } catch (error) {
        next(error);
    }
};

exports.getApprovedSeatsSummaryDetails = async (req, res, next) => {
    try {
        const isFacilityAdmin = await validateFacilityAdmin(req.emp.empId);
        if (!isFacilityAdmin) {
            throw new ErrorClass('Forbidden', 403);
        }
        const isInvalidRequest = commonUtilService.validateRequest(req.params, {
            facilityId: true,
            floorNo: true,
            queryDate: true,
        });
        if (isInvalidRequest) {
            throw new ErrorClass('Invalid params', 400);
        }

        const { facilityId, floorNo, queryDate } = req.params;
        const date = commonUtilService.formatDate(queryDate);

        const approvedBookingDetails = await NewBooking.find({
            facilityId,
            floorNo,
            fromDate: { $lte: date },
            toDate: { $gte: date },
            blockedDates: { $ne: date },
            cancelledDates: { $ne: date },
            currentStatus: constants.REQUEST_ACTION.APPROVED,
        }).select('-_id');

        const reqApprovedBookingInfo = [];

        approvedBookingDetails.forEach((booking) => {
            booking.selectedSeats.forEach((eachSeat) => {
                const eachBookingInfo = {};
                eachBookingInfo.bookedBy = booking.empId;
                eachBookingInfo.bookedByName = booking.bookedByName;
                eachBookingInfo.seatNo = eachSeat.seatNo;
                eachBookingInfo.bookedFor = eachSeat.bookedFor;
                eachBookingInfo.bookedForName = eachSeat.bookedForName;
                reqApprovedBookingInfo.push(eachBookingInfo);
            });
        });

        res.status(200).send({ data: reqApprovedBookingInfo, status: 200 });
    } catch (err) {
        next(err);
    }
};
function emptyListingDataBookingDetails(findSeat) {
    findSeat.bookedBy = '';
    findSeat.bookedByName = '';
    findSeat.bookedFor = '';
    findSeat.bookedForName = '';
    findSeat.bookedFrom = null;
    findSeat.bookedTo = null;
}
