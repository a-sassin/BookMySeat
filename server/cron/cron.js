const moment = require('moment');
const fs = require('fs');
const path = require('path');
const { FloorPlan } = require('../models/floorPlan.model');
const NewBooking = require('../models/newBooking.model');
const {
    REQUEST_STATUS,
    SEAT_STATUS,
    FACILITY_ADMIN_ROLES,
    MAIL_FOOTER,
} = require('../constants/constants');
const {
    formatDate,
    getFloorPlan,
    arrayOfEmails,
} = require('../services/common.util.service');
const FacilityAdminModel = require('../models/facilityAdmin.model');
const ErrorClass = require('../services/error.service');
const adUtilService = require('../services/ad.util.service');
const { sendMailToEmployee } = require('../services/mailer.util.service');

exports.deletePastData = async (req, res, next) => {
    try {
        const filePath = path.join(
            __dirname,
            'cleanup',
            'floorPlan-archive.json'
        );
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify({ data: [] }));
        }
        const today = moment();
        const floorsData = await FloorPlan.find();
        await Promise.all(
            floorsData.map(async (eachFloor) => {
                const deletedListingData = [];
                if (eachFloor.listingData.length) {
                    const newListingData = [];
                    eachFloor.listingData.forEach((eachData) => {
                        const listingDate = moment(eachData.listingDate);
                        if (today.diff(listingDate, 'days') < 7) {
                            newListingData.push(eachData);
                        } else {
                            deletedListingData.push(eachData);
                        }
                    });
                    await FloorPlan.updateOne(
                        { _id: eachFloor._id },
                        { listingData: newListingData }
                    );
                }
                if (deletedListingData.length) {
                    const { data } = JSON.parse(
                        fs.readFileSync(filePath, 'utf-8')
                    );
                    const floorData = data.find(
                        (datum) => datum.floorId === eachFloor.floorId
                    );
                    if (floorData) {
                        floorData.listingData.push(deletedListingData);
                    } else {
                        eachFloor.listingData = deletedListingData;
                        data.push(eachFloor);
                    }

                    fs.writeFileSync(filePath, JSON.stringify({ data }));
                }
            })
        );
        res.status(200).send({
            message: 'Data cleaned successfully',
        });
    } catch (err) {
        next(err);
    }
};

exports.cancelUnApprovedBookings = async (req, res, next) => {
    try {
        const bookingsInfo = await NewBooking.find({
            currentStatus: {
                $in: [REQUEST_STATUS.PENDING_L1, REQUEST_STATUS.PENDING_L2],
            },
        });
        const autoCancelledBookings = [];
        const currDate = moment(new Date());

        if (bookingsInfo.length) {
            await Promise.all(
                bookingsInfo.map(async (bookingInfo) => {
                    const timeDiff = moment.duration(
                        currDate.diff(moment(bookingInfo.updatedAt))
                    );
                    const timeDiffInHours = timeDiff.asHours();
                    if (timeDiffInHours >= 12) {
                        const eachBookingInfo = await NewBooking.findOne({
                            requestId: bookingInfo.requestId,
                        });
                        autoCancelledBookings.push(eachBookingInfo);
                        const bookingDates = [];
                        const fromDate = moment(bookingInfo.fromDate);
                        for (
                            let m = fromDate;
                            m.diff(moment(bookingInfo.toDate), 'days') <= 0;
                            m.add(1, 'days')
                        ) {
                            bookingDates.push(formatDate(m));
                        }
                        let floorPlanDoc;
                        await Promise.all(
                            bookingDates.map(async (bookingDate) => {
                                const floorPlanData = await getFloorPlan(
                                    bookingInfo.floorId,
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
                        const listingDataArray =
                            floorPlanDoc._doc.listingData.map(
                                (listing) => listing._doc
                            );

                        bookingDates.forEach((bookingDate) => {
                            const queriedDateIndex = listingDataArray.findIndex(
                                (listData) =>
                                    listData.listingDate.toString() ===
                                    bookingDate.toString()
                            );
                            const listingData =
                                floorPlanDoc.listingData[queriedDateIndex];
                            bookingInfo.selectedSeats.forEach((seat) => {
                                const seatFound = listingData.seats.find(
                                    (s) =>
                                        s.seatNo.toString() ===
                                        seat.seatNo.toString()
                                );
                                if (!seatFound) {
                                    throw new ErrorClass(
                                        `Malformed booking, details for seat ${
                                            seat.seatNo
                                        } not found for date ${moment(
                                            bookingDate
                                        ).format('LL')}`,
                                        400
                                    );
                                }
                                bookingInfo.rejectionReason =
                                    REQUEST_STATUS.AUTO_CANCELLED;
                                seatFound.bookedBy = '';
                                seatFound.bookedFor = '';
                                seatFound.bookedForName = '';
                                seatFound.bookedFrom = '';
                                seatFound.bookedTo = '';
                                seatFound.bookedByName = '';
                                seatFound.status = SEAT_STATUS.AVAILABLE;
                            });
                            listingData.availableSeatsCount =
                                listingData.seats.filter(
                                    (s) => s.status === SEAT_STATUS.AVAILABLE
                                ).length;

                            listingData.blockedSeatsCount =
                                listingData.seats.filter(
                                    (s) => s.status === SEAT_STATUS.BLOCKED
                                ).length;

                            listingData.bookedSeatsCount =
                                listingData.seats.filter(
                                    (s) => s.status === SEAT_STATUS.BOOKED
                                ).length;
                        });
                        bookingInfo.currentStatus =
                            REQUEST_STATUS.AUTO_CANCELLED;
                        await floorPlanDoc.save();
                        await bookingInfo.save();
                    }
                })
            );
        }
        res.status(200).send({
            message: 'Auto cancelled requests successfully',
        });

        await Promise.all(
            autoCancelledBookings.map(async (autoCancelledBooking) => {
                const self = await adUtilService.getEmpDetail(
                    autoCancelledBooking.empId
                );
                const otherMails = [];
                await Promise.all(
                    autoCancelledBooking.selectedSeats.map(async (seat) => {
                        const user = await adUtilService.getEmpDetail(
                            seat.bookedFor
                        );
                        if (user.mail && self.mail !== user.mail) {
                            otherMails.push(user.mail);
                        }
                    })
                );
                const mailMessage = `<p>Booking request with request id <b>${autoCancelledBooking.requestId}</b> has been auto cancelled due to inactivity on request within 12 hours</p> ${MAIL_FOOTER}`;
                const mailSubject =
                    'BMS Notification: Seat booking request auto cancelled';
                if (self.mail) {
                    const mailOptionsSelf = {
                        to: self.mail,
                        subject: mailSubject,
                        html: `<p>Hello, ${self.name}</p> ${mailMessage}`,
                    };
                    sendMailToEmployee(mailOptionsSelf);
                }

                if (otherMails.length) {
                    const mailOptionsBulk = {
                        to: otherMails,
                        subject: mailSubject,
                        html: `<p>Hello,</p> ${mailMessage}`,
                    };
                    sendMailToEmployee(mailOptionsBulk);
                }
                if (
                    autoCancelledBooking.currentStatus ===
                    REQUEST_STATUS.PENDING_L1
                ) {
                    const empInfo = await adUtilService.getEmpDetail(
                        autoCancelledBooking.L1Approver
                    );

                    if (empInfo.mail) {
                        const mailOptions = {
                            to: empInfo.mail,
                            subject: mailSubject,
                            html: `<p>Hello,${empInfo.name}</p> ${mailMessage}`,
                        };

                        await sendMailToEmployee(mailOptions);
                    }
                }
                if (
                    autoCancelledBooking.currentStatus ===
                    REQUEST_STATUS.PENDING_L2
                ) {
                    const query = {
                        $or: [
                            { isSuperAdmin: true },
                            {
                                assignedPractices:
                                    autoCancelledBooking.practice,
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
                            subject: mailSubject,
                            html: `<p>Hello,</p> ${mailMessage}`,
                        };
                        await sendMailToEmployee(mailOptions);
                    }
                }
            })
        );
    } catch (err) {
        next(err);
    }
};
