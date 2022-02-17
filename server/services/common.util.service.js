const moment = require('moment');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const {
    REQUEST_STATUS,
    DATE_FORMAT,
    FACILITY_ADMIN_ROLES,
    VISIT_REQ_STATUS,
} = require('../constants/constants');
const Employee = require('../models/employee.model');
const NewBooking = require('../models/newBooking.model');
const { counter } = require('../models/counter.model');
const FacilityAdmin = require('../models/facilityAdmin.model');
const VisitBooking = require('../models/visitBookings.model');
const constants = require('../constants/constants');
const { FloorPlan } = require('../models/floorPlan.model');
const FloorMap = require('../models/floorMap.model');
const ErrorClass = require('./error.service');

function validateRequest(request, params) {
    let isInvalidRequest = Object.keys(request).some(
        (key) => !Object.keys(params).includes(key)
    );
    if (isInvalidRequest) return isInvalidRequest;

    const invalidArray = [null, undefined, 'null', 'undefined', ''];
    for (const key in params) {
        if (params[key] && invalidArray.includes(request[key])) {
            isInvalidRequest = true;
            break;
        }
    }
    return isInvalidRequest;
}

// generic pagination object creator
function getPaginationObject(paginationAttributes) {
    return {
        limit: parseInt(paginationAttributes.limit),
        offset: parseInt(paginationAttributes.offset),
        total: paginationAttributes.total,
        count: paginationAttributes.count,
    };
}

async function getPendingRequestCount(empId) {
    let seatBookingCount = 0,
        visitBookingCount = 0,
        totalBookingCount = 0;
    try {
        const filter = {
            fromDate: {
                $gte: formatDate(moment(new Date()).format(DATE_FORMAT)),
            },
        };
        const queryData = {
            date: {
                $gte: formatDate(moment(new Date()).format(DATE_FORMAT)),
            },
        };
        const facilityAdmin = await FacilityAdmin.findOne({
            empId,
        });
        if (
            facilityAdmin &&
            (isSeatApprover(facilityAdmin) || facilityAdmin.isSuperAdmin)
        ) {
            filter.currentStatus = REQUEST_STATUS.PENDING_L2;
            if (!facilityAdmin.isSuperAdmin) {
                filter.practice = {
                    $in: facilityAdmin.assignedPractices,
                };
            }
        } else {
            filter.L1Approver = empId.toLowerCase();
            filter.currentStatus = REQUEST_STATUS.PENDING_L1;
        }

        if (
            facilityAdmin &&
            (isVisitApprover(facilityAdmin) || facilityAdmin.isSuperAdmin)
        ) {
            queryData.currentStatus = VISIT_REQ_STATUS.PENDING;
            if (!facilityAdmin.isSuperAdmin) {
                queryData.practice = {
                    $in: facilityAdmin.assignedPractices,
                };
            }
            visitBookingCount = await VisitBooking.countDocuments(queryData);
        }
        seatBookingCount = await NewBooking.countDocuments(filter);
        totalBookingCount = seatBookingCount + visitBookingCount;
        return {
            seatBookingCount,
            visitBookingCount,
            totalBookingCount,
        };
    } catch (error) {
        return {
            seatBookingCount,
            visitBookingCount,
            totalBookingCount,
        };
    }
}

function checkPaginationParams(req) {
    req.query.offset = req.query.offset || 0;
    req.query.limit = req.query.limit || 5;
    req.query.filter = req.query.filter || '';
}

function getSortingObject(req) {
    const sortObject = {};
    const { orderBy, sortOrder } = req.query;
    let inValidSortingParams = false;
    if (orderBy && sortOrder) {
        if (['ascending', 'asc', 'desc', 'descending'].includes(sortOrder)) {
            sortObject[orderBy] = sortOrder;
        } else {
            inValidSortingParams = true;
        }
    }
    return { sortObject, inValidSortingParams };
}

async function getEmployeeFromToken(token) {
    try {
        const decoded = jwt.verify(token, process.env.JWT_KEY);
        return await Employee.findOne({
            empId: decoded.empId.toLowerCase(),
        });
    } catch (error) {
        return null;
    }
}

function formatDate(date) {
    return moment(date, DATE_FORMAT).toDate();
}

async function getFloorPlan(floorId, fromDate) {
    const floorPlan = await FloorPlan.findOne({
        floorId,
        listingData: {
            $elemMatch: {
                listingDate: {
                    $eq: formatDate(fromDate),
                },
            },
        },
    });
    return floorPlan;
}

async function getRequestId(id) {
    let seqValue;
    const isIdExists = await counter.findOne({ _id: id });
    if (!isIdExists) {
        await counter({ _id: id, sequence_value: 100 }).save();
        seqValue = 100;
    } else {
        const doc = await counter.findOneAndUpdate(
            { _id: id },
            { $inc: { sequence_value: 1 } }
        );
        seqValue = doc.sequence_value + 1;
    }
    if (id === 'requestid') {
        return `BMS-SB-${seqValue}`;
    }
    if (id === 'visitrequestid') {
        return `BMS-VB-${seqValue}`;
    }
    return `BMS-BF-${seqValue}`;
}

async function validateFacilityAdmin(empId) {
    try {
        const facilityAdmin = await FacilityAdmin.findOne({
            empId: empId.toLowerCase(),
        }).select('-_id -__v -updatedAt');
        return facilityAdmin;
    } catch (err) {
        throw new Error(err);
    }
}

function filterDate(date) {
    return date
        ? formatDate(date)
        : { $gte: formatDate(moment().format('DD-MM-YYYY')) };
}

function currentDate() {
    return formatDate(moment().format('DD-MM-YYYY'));
}

function isVisitApprover(facilityAdmin) {
    return facilityAdmin.roles.includes(
        FACILITY_ADMIN_ROLES.BOOK_VISIT_APPROVER
    );
}

function isSeatApprover(facilityAdmin) {
    return facilityAdmin.roles.includes(
        FACILITY_ADMIN_ROLES.BOOK_SEAT_APPROVER
    );
}

function arrayOfEmails(emails) {
    return emails.map((email) => email._doc.email);
}

async function createListingData(
    facilityId,
    floorNo,
    queryDate,
    isFloorAvailable
) {
    const newListingData = { listingDate: queryDate };

    const listingData = await FloorMap.findOne({
        facilityId,
        floorNo,
    }).select(
        '-_id -assignedPractice -floorNo -facilityName -facilityId -createdBy -updatedBy -__v'
    );

    if (!listingData) {
        throw new ErrorClass('Floor data not found!', 404);
    }

    newListingData.totalSeatsCount = listingData.totalSeatsCount;
    newListingData.isFloorAvailableForBooking = isFloorAvailable;
    newListingData.seats = listingData.seats.map((seat) => {
        let seatStatus, newSocialDistanceEnabled;
        if (
            seat.updatedDetails.date &&
            queryDate.toISOString() >= seat.updatedDetails.date.toISOString()
        ) {
            seatStatus = seat.updatedDetails.status;
            newSocialDistanceEnabled = !(
                seatStatus === constants.SEAT_STATUS.AVAILABLE
            );
        } else {
            seatStatus = seat.socialDistancingEnabled
                ? constants.SEAT_STATUS.UNAVAILABLE
                : constants.SEAT_STATUS.AVAILABLE;
            newSocialDistanceEnabled = seat.socialDistancingEnabled;
        }
        return {
            status: seat.status || seatStatus,
            seatNo: seat.seatNo,
            coordinates: seat.coordinates,
            socialDistancingEnabled: newSocialDistanceEnabled,
            seatId: mongoose.Types.ObjectId(),
            bookedBy: '',
            bookedFrom: '',
            bookedTo: '',
            bookedFor: seat.bookedFor || '',
            bookedForName: seat.bookedForName || '',
        };
    });
    modifyListingDataSeatCount(newListingData);
    return newListingData;
}

function modifyListingDataSeatCount(listingDatum) {
    const blockedSeatsCnt = listingDatum.seats.filter(
        (s) => s.status === constants.SEAT_STATUS.BLOCKED
    ).length;
    const bookedSeatsCnt = listingDatum.seats.filter(
        (s) => s.status === constants.SEAT_STATUS.BOOKED
    ).length;
    const unavailableSeatsCount = listingDatum.seats.filter(
        (s) => s.socialDistancingEnabled
    ).length;

    listingDatum.bookedSeatsCount = bookedSeatsCnt;
    listingDatum.blockedSeatsCount = blockedSeatsCnt;
    listingDatum.availableSeatsCount =
        listingDatum.totalSeatsCount -
        unavailableSeatsCount -
        blockedSeatsCnt -
        bookedSeatsCnt;
}

function messageOnDates(fromDate, toDate) {
    const fDate = moment(fromDate).format('LL');
    const tDate = moment(toDate).format('LL');
    if (fromDate.toString() === toDate.toString()) {
        return `for <b>${fDate}</b>`;
    }
    if (
        toDate.toString() === formatDate(constants.INDEFINITE_PERIOD).toString()
    ) {
        return `from <b>${fDate}</b> onwards until further notice`;
    }
    return `from <b>${fDate}</b> to <b>${tDate}</b>`;
}

module.exports = {
    createListingData,
    validateFacilityAdmin,
    getRequestId,
    getEmployeeFromToken,
    getSortingObject,
    checkPaginationParams,
    getPaginationObject,
    validateRequest,
    getPendingRequestCount,
    formatDate,
    filterDate,
    isSeatApprover,
    isVisitApprover,
    arrayOfEmails,
    currentDate,
    messageOnDates,
    getFloorPlan,
    modifyListingDataSeatCount,
};
