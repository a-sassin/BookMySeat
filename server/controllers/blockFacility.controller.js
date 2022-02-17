/* eslint-disable no-await-in-loop */
const moment = require('moment');
const { FloorPlan } = require('../models/floorPlan.model');
const { BlockHistory } = require('../models/blockHistory.model');
const { myQueue } = require('../services/queue.service');
const constants = require('../constants/constants');
const ErrorClass = require('../services/error.service');
const utils = require('../services/common.util.service');
const { getEmpDetail } = require('../services/ad.util.service');

exports.blockFacilityController = async (req, res, next) => {
    try {
        validateBlockAPI(req, true);

        const isFacilityAdmin = await utils.validateFacilityAdmin(
            req.emp.empId
        );
        const isAuthorized = isUserAuthorized(isFacilityAdmin);
        if (!isAuthorized) {
            throw new ErrorClass(
                'You are not authorized to block a facility',
                403
            );
        }

        const fromDate = utils.formatDate(req.body.fromDate);
        const toDate = utils.formatDate(req.body.toDate);
        const indefiniteDate = utils.formatDate(constants.INDEFINITE_PERIOD);
        const { floors, facilityId } = req.body.data;

        validateDates(fromDate, toDate);

        if (!constants.SUPPORTED_FACILITIES.includes(facilityId)) {
            throw new ErrorClass('Invalid facilityId', 400);
        }

        const floorNotFound = [];
        const bhFilter = getBlockHistoryFilter(
            fromDate,
            toDate,
            floors,
            facilityId
        );
        const isAlreadyBlocked = await BlockHistory.findOne(bhFilter);

        if (isAlreadyBlocked) {
            throw new ErrorClass(
                'One or more facilities already blocked for the given date range',
                400
            );
        }

        await Promise.all(
            floors.map(async (floorNo) => {
                const queryString = {
                    facilityId,
                    floorNo,
                };

                const floorPlanExist = await FloorPlan.findOne(queryString);
                if (!floorPlanExist) {
                    floorNotFound.push(floorNo);
                } else if (toDate.toString() === indefiniteDate.toString()) {
                    await FloorPlan.findOneAndUpdate(queryString, {
                        $set: {
                            indefiniteBlockingFromDate: fromDate,
                        },
                    });
                } else {
                    const data = {
                        toDate,
                        fromDate,
                        queryString,
                        facilityId,
                        floorNo,
                    };
                    await updateFloorPlan(data);
                }
            })
        );

        const floor = floors.map((data) => {
            return { number: data };
        });
        const { empId } = req.emp;
        const employeeInfo = await getEmpDetail(empId);
        const newBlockHistory = new BlockHistory({
            id: 0,
            fromDate,
            toDate,
            'facility.facilityId': facilityId,
            'facility.floors': floor,
            reason: req.body.rejectionReason,
            blockedBy: empId,
            blockedByName: employeeInfo.name,
        });
        const blockReqId = await utils.getRequestId('blockfacilityid');
        newBlockHistory.id = blockReqId;

        if (floorNotFound.length === floors.length) {
            throw new ErrorClass(
                'No Floor data for any of the floors mentioned was found',
                404
            );
        }
        if (floorNotFound.length && floorNotFound.length < floors.length) {
            res.status(207).send({
                status: '207',
                data: {
                    message: `Error while blocking a floor(s). Floor data for ${[
                        ...floorNotFound,
                    ]} of ${facilityId} facility not found`,
                    blockReqId,
                },
            });
        } else {
            await BlockHistory(newBlockHistory).save();
            let isIndefiniteblocking = false;
            if (toDate.toString() === indefiniteDate.toString()) {
                req.body.toDate = moment(fromDate)
                    .add(constants.ALLOWED_MAX_FUTURE_DAYS, 'd')
                    .format('DD-MM-YYYY');
                isIndefiniteblocking = true;
            }
            myQueue(req.body, isIndefiniteblocking);

            res.status(200).send({
                status: '200',
                data: {
                    message: 'Block request accepted successfully',
                    blockReqId,
                },
            });
        }
    } catch (error) {
        next(error);
    }
};

exports.unblockFacilityController = async (req, res, next) => {
    try {
        validateBlockAPI(req, false);

        const { floors, facilityId } = req.body.data;
        const fromDate = utils.formatDate(req.body.fromDate);
        const toDate = utils.formatDate(req.body.toDate);
        const indefiniteDate = utils.formatDate(constants.INDEFINITE_PERIOD);
        const floorNotFound = [];

        if (!constants.SUPPORTED_FACILITIES.includes(facilityId)) {
            throw new ErrorClass('Invalid facilityId', 400);
        }
        const isInvalidRequest = utils.validateRequest(req.query, {
            id: true,
        });
        if (isInvalidRequest) {
            throw new ErrorClass('Invalid parameters sent', 400);
        }

        const isFacilityAdmin = await utils.validateFacilityAdmin(
            req.emp.empId
        );
        const isAuthorized = isUserAuthorized(isFacilityAdmin);
        if (!isAuthorized) {
            throw new ErrorClass(
                'You are not authorized to unblock a facility',
                403
            );
        }

        const isToDateExpired = moment(utils.formatDate(toDate)).isBefore(
            moment(),
            'day'
        );
        if (isToDateExpired) {
            throw new ErrorClass(
                'Cannot unblock the floors for past dates.',
                400
            );
        }

        const blockHistory = await BlockHistory.findOne({
            id: req.query.id,
            'facility.facilityId': facilityId,
        });
        const updateExp = {};
        let floorsData = [];
        if (blockHistory) {
            floorsData = blockHistory.facility.floors;
        }

        await Promise.all(
            floors.map(async (floorNo) => {
                const queryString = {
                    facilityId,
                    floorNo,
                };
                queryString.facilityId = facilityId;
                queryString.floorNo = floorNo;
                if (toDate.toString() === indefiniteDate.toString()) {
                    queryString.indefiniteBlockingFromDate = fromDate;
                    const floorPlan = await FloorPlan.findOne(queryString);
                    if (!floorPlan) {
                        throw new ErrorClass(
                            'No Floor data for any of the floors mentioned was found',
                            404
                        );
                    }
                    await FloorPlan.findOneAndUpdate(queryString, {
                        $set: {
                            indefiniteBlockingFromDate: '',
                        },
                    });
                } else {
                    const tDate = moment(toDate);
                    for (
                        let m = moment(fromDate);
                        m.diff(tDate, 'days') <= 0;
                        m.add(1, 'days')
                    ) {
                        queryString.listingData = {
                            $elemMatch: {
                                listingDate: {
                                    $eq: utils.formatDate(m),
                                },
                            },
                        };
                        let floorPlan = await FloorPlan.findOne(queryString);
                        if (!floorPlan) {
                            floorNotFound.push(floorNo);
                        } else {
                            floorPlan = await updateFloorAvailableForBooking(
                                floorPlan,
                                m,
                                floorNo,
                                facilityId
                            );
                        }
                    }
                }
                if (blockHistory) {
                    floorsData.forEach((data) => {
                        if (data.number === floorNo.toString()) {
                            data.status = constants.BLOCK_STATUS.UNBLOCKED;
                        }
                    });
                }
            })
        );

        const { empId } = req.emp;
        const employeeInfo = await getEmpDetail(empId);
        updateExp.$set = {
            'facility.floors': floorsData,
            blockedBy: empId,
            blockedByName: employeeInfo.name,
        };
        if (floorNotFound.length === floors.length) {
            throw new ErrorClass(
                'No Floor data for any of the floors mentioned was found',
                404
            );
        }
        if (floorNotFound.length && floorNotFound.length < floors.length) {
            res.status(207).send({
                status: '207',
                data: {
                    message: `Error while unblocking a floor(s). Floor data for ${[
                        ...floorNotFound,
                    ]} of ${facilityId} facility not found`,
                },
            });
        } else {
            await BlockHistory.updateOne(
                {
                    id: req.query.id,
                    'facility.facilityId': facilityId,
                },
                updateExp
            );
            res.status(200).send({
                status: '200',
                data: {
                    message: 'Requested floors unblocked successfully',
                },
            });
        }
    } catch (error) {
        next(error);
    }
};

module.exports.updateBlockFacility = async (req, res, next) => {
    try {
        validateBlockAPI(req, false);

        const isFacilityAdmin = await utils.validateFacilityAdmin(
            req.emp.empId
        );
        const isAuthorized = isUserAuthorized(isFacilityAdmin);
        if (!isAuthorized) {
            throw new ErrorClass('You are not authorized to update', 403);
        }
        const isInvalidRequest = utils.validateRequest(req.query, {
            id: true,
        });
        if (isInvalidRequest) {
            throw new ErrorClass('Invalid parameters sent', 400);
        }

        const { floors, facilityId } = req.body.data;
        const fromDate = utils.formatDate(req.body.fromDate);
        const toDate = utils.formatDate(req.body.toDate);
        const indefiniteDate = utils.formatDate(constants.INDEFINITE_PERIOD);
        const { rejectionReason } = req.body;
        const { id } = req.query;
        const floorNotFound = [];
        validateDates(fromDate, toDate);

        const bhFilter = getBlockHistoryFilter(
            fromDate,
            toDate,
            floors,
            facilityId
        );
        bhFilter.id = { $nin: req.query.id };
        const isAlreadyBlocked = await BlockHistory.findOne(bhFilter);
        if (isAlreadyBlocked) {
            throw new ErrorClass(
                'One or more facilities already blocked for the given date range',
                400
            );
        }
        const updateExpToUnblock = {};
        const updateExpToBlock = {};

        const blockHistory = await BlockHistory.findOne({
            id,
            'facility.facilityId': facilityId,
        });

        const initialFloorsData = await BlockHistory.findOne({
            id,
            'facility.facilityId': facilityId,
        });
        let floorsDataToBlock = [];
        let floorsDataToUnblock = [];
        if (blockHistory) {
            floorsDataToBlock = blockHistory.facility.floors;
            floorsDataToUnblock = blockHistory.facility.floors;

            const floorsToUnblock = floorsDataToUnblock.map(
                (data) => data.number
            );

            await Promise.all(
                floorsToUnblock.map(async (floorNo) => {
                    const queryString = {
                        facilityId,
                        floorNo,
                    };
                    queryString.facilityId = facilityId;
                    queryString.floorNo = floorNo;
                    if (
                        blockHistory.toDate.toString() ===
                        indefiniteDate.toString()
                    ) {
                        await FloorPlan.findOneAndUpdate(queryString, {
                            $set: {
                                indefiniteBlockingFromDate: '',
                            },
                        });
                    } else {
                        const tDate = moment(blockHistory.toDate);
                        for (
                            let m = moment(blockHistory.fromDate);
                            m.diff(tDate, 'days') <= 0;
                            m.add(1, 'days')
                        ) {
                            queryString.listingData = {
                                $elemMatch: {
                                    listingDate: {
                                        $eq: utils.formatDate(m),
                                    },
                                },
                            };
                            let floorPlan = await FloorPlan.findOne(
                                queryString
                            );
                            if (floorPlan) {
                                floorPlan =
                                    await updateFloorAvailableForBooking(
                                        floorPlan,
                                        m,
                                        floorNo,
                                        facilityId
                                    );
                            }
                        }
                    }

                    if (blockHistory) {
                        floorsDataToUnblock.forEach((data) => {
                            if (data.number === floorNo.toString()) {
                                data.status = constants.BLOCK_STATUS.UNBLOCKED;
                            }
                        });
                    }
                })
            );
            updateExpToUnblock.$set = {
                'facility.floors': floorsDataToUnblock,
            };

            await BlockHistory.updateOne(
                {
                    id: req.query.id,
                    'facility.facilityId': facilityId,
                },
                updateExpToUnblock,
                {
                    upsert: true,
                }
            );
        }

        await Promise.all(
            floors.map(async (floorNo) => {
                const queryString = {
                    facilityId,
                    floorNo,
                };

                const floorPlanExist = await FloorPlan.findOne(queryString);
                if (!floorPlanExist) {
                    floorNotFound.push(floorNo);
                } else if (toDate.toString() === indefiniteDate.toString()) {
                    await FloorPlan.findOneAndUpdate(queryString, {
                        $set: {
                            indefiniteBlockingFromDate: fromDate,
                        },
                    });
                } else {
                    const data = {
                        toDate,
                        fromDate,
                        queryString,
                        facilityId,
                        floorNo,
                    };
                    await updateFloorPlan(data);
                }
                if (blockHistory) {
                    const floorsPresent = floorsDataToBlock.find(
                        (everyFloor) => everyFloor.number === floorNo.toString()
                    );
                    if (floorsPresent) {
                        floorsDataToBlock.forEach((data) => {
                            if (data.number === floorNo.toString()) {
                                data.status = constants.BLOCK_STATUS.BLOCKED;
                            }
                        });
                    } else {
                        floorsDataToBlock.push({
                            status: constants.BLOCK_STATUS.BLOCKED,
                            number: floorNo.toString(),
                        });
                    }
                }
            })
        );
        const { empId } = req.emp;
        const employeeInfo = await getEmpDetail(empId);
        updateExpToBlock.$set = {
            'facility.floors': floorsDataToBlock,
            fromDate,
            toDate,
            reason: rejectionReason,
            blockedBy: empId,
            blockedByName: employeeInfo.name,
        };

        if (floorNotFound.length === floors.length) {
            throw new ErrorClass(
                'No Floor data for any of the floors mentioned was found',
                404
            );
        }
        if (floorNotFound.length && floorNotFound.length < floors.length) {
            res.status(207).send({
                status: '207',
                data: {
                    message: `Error while unblocking a floor(s). Floor data for ${[
                        ...floorNotFound,
                    ]} of ${facilityId} facility not found`,
                },
            });
        } else {
            if (blockHistory) {
                await BlockHistory.updateOne(
                    {
                        id: req.query.id,
                        'facility.facilityId': facilityId,
                    },
                    updateExpToBlock,
                    {
                        upsert: true,
                    }
                );
            }
            let isIndefiniteblocking = false;
            if (toDate.toString() === indefiniteDate.toString()) {
                req.body.toDate = moment(fromDate)
                    .add(constants.ALLOWED_MAX_FUTURE_DAYS, 'd')
                    .format('DD-MM-YYYY');
                isIndefiniteblocking = true;
            }
            myQueue(req.body, isIndefiniteblocking);

            res.status(200).send({
                status: '200',
                data: {
                    message: 'Requested floors updated successfully',
                },
            });
        }
    } catch (error) {
        next(error);
    }
};

exports.blockHistoryController = async (req, res, next) => {
    try {
        const { sortObject, inValidSortingParams } =
            utils.getSortingObject(req);
        if (inValidSortingParams) {
            throw new ErrorClass('Invalid sorting parameters', 400);
        }
        const isInvalidRequest = utils.validateRequest(req.query, {
            date: false,
            month: false,
            year: false,
            offset: false,
            limit: false,
            orderBy: false,
            sortOrder: false,
        });
        if (isInvalidRequest) {
            throw new ErrorClass(
                'Invalid request.Required attributes missing.',
                400
            );
        }
        utils.checkPaginationParams(req);

        const isFacilityAdmin = await utils.validateFacilityAdmin(
            req.emp.empId
        );
        const isAuthorized = isUserAuthorized(isFacilityAdmin);
        if (!isAuthorized) {
            throw new ErrorClass(
                'You are not authorized to view the block history',
                403
            );
        }
        const { date, month, year } = req.query;
        let filter = {
            'facility.floors': {
                $elemMatch: {
                    status: {
                        $eq: constants.BLOCK_STATUS.BLOCKED,
                    },
                },
            },
        };
        if (date) {
            const localDate = utils.formatDate(date);
            filter = {
                fromDate: { $lte: localDate },
                toDate: { $gte: localDate },
                ...filter,
            };
        } else if (month && year) {
            const fromDateDay = moment(
                `${year}-${month}`,
                'YYYY-MM'
            ).daysInMonth();

            const fromDate = convertDate(year, month, 1);

            const toDate = convertDate(year, month, fromDateDay);

            filter = {
                $or: [
                    { fromDate: { $gte: fromDate, $lte: toDate } },
                    { toDate: { $lte: toDate, $gte: fromDate } },
                    {
                        toDate: {
                            $eq: utils.formatDate(constants.INDEFINITE_PERIOD),
                        },
                    },
                ],
                ...filter,
            };
        }
        const blockHistory = await BlockHistory.find(filter)
            .sort({ updatedAt: -1 })
            .select('-_id -__v');
        const startValue = parseInt(req.query.offset);
        const endValue = parseInt(req.query.offset) + parseInt(req.query.limit);
        const totalBookingsCount = blockHistory.length;
        const paginatedBookings = blockHistory.slice(startValue, endValue);

        paginatedBookings.forEach((booking) => {
            let { floors } = booking.facility;
            floors = floors
                .filter((e) => e.status === constants.BLOCK_STATUS.BLOCKED)
                .map((e) => e.number);
            booking.facility._doc.floors = floors;
        });

        const paginationObject = utils.getPaginationObject({
            limit: req.query.limit,
            offset: req.query.offset,
            total: totalBookingsCount,
            count: paginatedBookings.length,
        });
        res.status(200).send({
            status: '200',
            data: paginatedBookings,
            pagination: paginationObject,
        });
    } catch (error) {
        next(error);
    }
};

async function updateFloorAvailableForBooking(
    floorPlan,
    m,
    floorNo,
    facilityId
) {
    const listingData = [...floorPlan.listingData];
    listingData.forEach((data) => {
        if (data.listingDate.toString() === utils.formatDate(m).toString()) {
            data.isFloorAvailableForBooking = true;
        }
    });
    const filter = { floorNo, facilityId },
        updateExpr = {};
    updateExpr.$set = {
        listingData,
    };
    floorPlan = await FloorPlan.findOneAndUpdate(filter, updateExpr, {
        returnOriginal: false,
    });
    return floorPlan;
}

async function updateFloorPlan(blockData) {
    const { toDate, fromDate, queryString, facilityId, floorNo } = blockData;
    const tDate = moment(toDate);
    for (
        let date = moment(fromDate);
        date.diff(tDate, 'days') <= 0;
        date.add(1, 'days')
    ) {
        queryString.listingData = {
            $elemMatch: {
                listingDate: {
                    $eq: utils.formatDate(date),
                },
            },
        };
        const floorPlan = await FloorPlan.findOne(queryString);
        const updateExpr = {};
        if (!floorPlan) {
            const newListingData = await utils.createListingData(
                facilityId,
                floorNo,
                utils.formatDate(moment(date).format(constants.DATE_FORMAT)),
                false
            );
            updateExpr.$push = {
                listingData: newListingData,
            };
        } else {
            const listingData = [...floorPlan.listingData];
            listingData.forEach((data) => {
                if (
                    data.listingDate.toString() ===
                    utils.formatDate(date).toString()
                ) {
                    data.isFloorAvailableForBooking = false;
                }
            });
            updateExpr.$set = {
                listingData,
            };
        }
        const filter = { floorNo, facilityId };
        await FloorPlan.updateOne(filter, updateExpr);
    }
}

function getBlockHistoryFilter(fromDate, toDate, floors, facilityId) {
    return {
        $or: [
            { fromDate: { $gte: fromDate, $lte: toDate } },
            { toDate: { $gte: fromDate, $lte: toDate } },
            { fromDate: { $lte: fromDate }, toDate: { $gte: toDate } },
        ],
        'facility.floors': {
            $elemMatch: {
                number: floors,
                status: constants.BLOCK_STATUS.BLOCKED,
            },
        },
        'facility.facilityId': facilityId,
    };
}

function convertDate(year, month, fromDateDay) {
    const date = `${fromDateDay}-${month}-${year}`;
    return utils.formatDate(date);
}

function validateDates(fromDate, toDate) {
    const today = utils.formatDate(moment().format(constants.DATE_FORMAT));
    const indefiniteDate = utils.formatDate(constants.INDEFINITE_PERIOD);
    if (fromDate < today || toDate < today) {
        throw new ErrorClass('Cannot select past dates', 400);
    }

    if (fromDate > toDate) {
        throw new ErrorClass('Todate cannot be less than from date', 400);
    }

    if (toDate.toString() !== indefiniteDate.toString()) {
        if (moment(fromDate).diff(moment(today), 'days') > 29) {
            throw new ErrorClass(
                'From date should be within 30 days from today',
                400
            );
        }
        if (
            moment(toDate).diff(moment(fromDate), 'days') >
            constants.ALLOWED_MAX_FUTURE_DAYS - 1
        ) {
            throw new ErrorClass(
                `Cannot block for more than ${constants.ALLOWED_MAX_FUTURE_DAYS} days at once`,
                400
            );
        }
    }
}

function validateBlockAPI(req, rejectionReason) {
    const isInvalidRequest = utils.validateRequest(req.body, {
        fromDate: true,
        toDate: true,
        data: true,
        rejectionReason,
    });
    if (isInvalidRequest) {
        throw new ErrorClass(
            'Invalid request. Required attributes missing from payload',
            400
        );
    }
}

function isUserAuthorized(isFacilityAdmin) {
    return (
        isFacilityAdmin &&
        (isFacilityAdmin.isSuperAdmin ||
            isFacilityAdmin.roles.includes(
                constants.FACILITY_ADMIN_ROLES.BOOK_SEAT_APPROVER
            ))
    );
}
