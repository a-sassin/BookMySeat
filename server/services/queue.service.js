/* eslint-disable no-await-in-loop */
const Queue = require('bee-queue');
const moment = require('moment');
const NewBooking = require('../models/newBooking.model');
const { FloorPlan } = require('../models/floorPlan.model');
const { REQUEST_STATUS, SEAT_STATUS } = require('../constants/constants');
const { formatDate, messageOnDates } = require('./common.util.service');
const constants = require('../constants/constants');
const { getEmpDetail } = require('./ad.util.service');
const { sendMailToEmployee } = require('./mailer.util.service');

const queue = new Queue('cancellation-queue', {});

let rejReason;

const myQueue = async (data, isIndefiniteblocking) => {
    rejReason = data.rejectionReason;
    const fromDate = formatDate(data.fromDate);
    const toDate = formatDate(data.toDate);
    await Promise.all(
        data.data.floors.map(async (floorNo) => {
            let queryString = {};
            queryString.facilityId = data.data.facilityId;
            queryString.floorNo = floorNo;

            queryString.currentStatus = {
                $nin: [
                    REQUEST_STATUS.CANCELLED,
                    REQUEST_STATUS.AUTO_CANCELLED,
                    REQUEST_STATUS.REJECTED_L1,
                    REQUEST_STATUS.REJECTED_L2,
                ],
            };
            queryString = {
                $or: [
                    { fromDate: { $gte: fromDate, $lte: toDate } },
                    { toDate: { $gte: fromDate, $lte: toDate } },
                    { fromDate: { $lte: fromDate }, toDate: { $gte: toDate } },
                ],
                ...queryString,
            };

            const bookingDetails = await NewBooking.find(queryString);

            if (bookingDetails.length) {
                bookingDetails.forEach((bookingData) => {
                    const job = queue
                        .createJob({
                            id: bookingData._id,
                            status: bookingData.currentStatus,
                            facilityId: bookingData.facilityId,
                            floorNo: bookingData.floorNo,
                            selectedSeats: bookingData.selectedSeats,
                            blockedFromDate: fromDate,
                            blockedToDate: toDate,
                            blockedDates: bookingData.blockedDates,
                            fromDate: bookingData.fromDate,
                            toDate: bookingData.toDate,
                            empId: bookingData.empId,
                            requestId: bookingData.requestId,
                            isIndefiniteblocking,
                        })
                        .delayUntil(moment().add(3, 'seconds').toISOString())
                        .retries(2);
                    job.save().then((job1) => {
                        console.log(job1.id, 'data is saved');
                    });
                    job.on('progress', (progress) => {
                        console.log(`Job ${job.id} reported`);
                        console.log(progress);
                    });
                    job.on('failed', (err) => {
                        console.log(
                            `Job ${job.id} failed with error ${err.message}`
                        );
                    });
                    job.on('retrying', (err) => {
                        console.log(
                            `Job ${job.id} failed with error ${err.message} but is being retried!`
                        );
                    });
                    job.on('succeeded', () => {
                        console.log(`Job ${job.id} succeeded`);
                    });
                });
            }
        })
    );
};

queue.process(async (job) => {
    const query = {};
    const {
        floorNo,
        facilityId,
        fromDate,
        toDate,
        blockedFromDate,
        blockedToDate,
        blockedDates,
        status,
        selectedSeats,
        empId,
        isIndefiniteblocking,
    } = job.data;
    query.facilityId = facilityId;
    query.floorNo = floorNo;
    const floorPlan = await FloorPlan.findOne(query);
    const originalListingData = floorPlan.listingData;

    const pendingStatus = [
        REQUEST_STATUS.PENDING_L1,
        REQUEST_STATUS.PENDING_L2,
    ];

    let count = 0;
    const empIds = [];

    const commonDates = [];
    const tDate = moment(toDate);
    for (
        let date = moment(fromDate);
        date.diff(tDate, 'days') <= 0;
        date.add(1, 'days')
    ) {
        count++;
        if (
            formatDate(date).toISOString() >= blockedFromDate.toString() &&
            formatDate(date).toISOString() <= blockedToDate.toString()
        ) {
            commonDates.push(formatDate(date));

            const listingData = originalListingData.find(
                (data) =>
                    moment(data._doc.listingDate).format('L') ===
                    moment(date).format('L')
            );

            if (
                listingData &&
                (listingData.bookedSeatsCount > 0 ||
                    listingData.blockedSeatsCount > 0)
            ) {
                const seatCount = selectedSeats.length;
                if (pendingStatus.includes(status)) {
                    listingData.blockedSeatsCount -= seatCount;
                } else {
                    listingData.bookedSeatsCount -= seatCount;
                }
                listingData.availableSeatsCount += seatCount;

                selectedSeats.forEach((seat) => {
                    const reqestedSeat = listingData.seats.find(
                        (s) => s.seatNo === seat.seatNo
                    );
                    if (reqestedSeat) {
                        empIds.push(reqestedSeat.bookedFor);
                        reqestedSeat.status = SEAT_STATUS.AVAILABLE;
                        reqestedSeat.bookedBy = '';
                        reqestedSeat.bookedFor = '';
                        reqestedSeat.bookedForName = '';
                        reqestedSeat.bookedFrom = '';
                        reqestedSeat.bookedTo = '';
                        reqestedSeat.bookedByName = '';
                    }
                });
            }
            await FloorPlan.updateOne(
                {
                    floorNo,
                    facilityId,
                },
                {
                    $set: {
                        listingData: originalListingData,
                    },
                }
            );
        }
    }

    const blockedDatesLength = blockedDates.length + commonDates.length;

    if (
        fromDate.toString() >= blockedFromDate.toString() &&
        toDate.toString() <= blockedToDate.toString()
    ) {
        await NewBooking.updateOne(
            {
                _id: job.data.id,
            },
            {
                $set: {
                    currentStatus: REQUEST_STATUS.CANCELLED,
                    rejectionReason: rejReason,
                },
            }
        );
    } else if (count === blockedDatesLength) {
        await NewBooking.updateOne(
            {
                _id: job.data.id,
            },
            {
                $set: {
                    currentStatus: REQUEST_STATUS.CANCELLED,
                    rejectionReason: rejReason,
                },
                $addToSet: {
                    blockedDates: commonDates,
                },
            }
        );
    } else {
        await NewBooking.updateOne(
            {
                _id: job.data.id,
            },
            {
                $addToSet: {
                    blockedDates: commonDates,
                },
            }
        );
    }

    job.reportProgress(await queue.checkHealth());
    const emails = [];
    const self = await getEmpDetail(empId);
    emails.push(self.mail);
    if (!pendingStatus.includes(status)) {
        await Promise.all(
            empIds.map(async (empployeeId) => {
                const subOrdinateData = await getEmpDetail(empployeeId);
                if (
                    subOrdinateData.mail &&
                    subOrdinateData.mail !== self.mail
                ) {
                    emails.push(subOrdinateData.mail);
                }
            })
        );
    }

    const mailOptions = {
        to: emails,
        subject: `${constants.FACILITY_NAMES[facilityId]}(${facilityId}) - Floor ${floorNo} is blocked`,
        html: `<p>Hello,<br><br><b>${
            constants.FACILITY_NAMES[facilityId]
        }(${facilityId})</b>  - Floor <b>${floorNo}</b> has been blocked ${messageOnDates(
            blockedFromDate,
            isIndefiniteblocking
                ? formatDate(constants.INDEFINITE_PERIOD)
                : blockedToDate
        )}</b> with the following comment - <b>${rejReason}</b>. All pre-approved/pending bookings for the facility on the given dates have been cancelled.</p> ${
            constants.MAIL_FOOTER
        }`,
    };

    const mailResponse = await sendMailToEmployee(mailOptions);

    return mailResponse;
});

module.exports = { myQueue };
