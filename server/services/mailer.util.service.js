const nodemailer = require('nodemailer');
const Queue = require('bee-queue');
const moment = require('moment');

const { isArray } = require('core-js/fn/array');
const ErrorClass = require('./error.service');
const {
    APPROVAL_LEVEL,
    ONLY_ALLOW_ALPHANUMERIC_REGEX,
    REQUEST_STATUS,
    MAIL_FOOTER,
} = require('../constants/constants');

const mailerQueue = new Queue('mailer-queue', {});

const { messageOnDates } = require('./common.util.service');

const getNumberWithOrdinal = (floorNo) => {
    if (!floorNo) {
        return '';
    }
    const ordinalList = ['th', 'st', 'nd', 'rd'];
    const floorNoRemainder = floorNo % 100;
    return (
        floorNo +
        (ordinalList[(floorNoRemainder - 20) % 10] ||
            ordinalList[floorNoRemainder] ||
            ordinalList[0])
    );
};

const addSectionAndOrdinalToTheFloor = (floorNo) => {
    let floorNumericValue;
    let floorSection;
    if (floorNo && ONLY_ALLOW_ALPHANUMERIC_REGEX.test(floorNo)) {
        // floorNo contains Alphabet characters. Ex - 8B
        const splittedFloorNo = floorNo.match(/[a-z]+|\d+/gi);
        [floorNumericValue, floorSection] = splittedFloorNo;
    } else {
        // consider its only numeric Ex - 4, 5, 6
        floorNumericValue = floorNo;
    }

    if (floorSection && floorNumericValue) {
        return `${getNumberWithOrdinal(
            floorNumericValue
        )} floor, section-${floorSection}`;
    }
    return `${getNumberWithOrdinal(floorNumericValue)} floor`;
};

// TODO: Replace auth with BMS Mail creds. once they are recieved
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.MAIL_ACCOUNT_USER,
        pass: process.env.MAIL_ACCOUNT_PASSWORD,
    },
});

async function sendMailToEmployee(mailOptions) {
    try {
        mailOptions.from = '"Book My Seat App" <noreply@gslab.com>';
        await transporter.sendMail(mailOptions);
    } catch (err) {
        throw new Error(err.message);
    }
}

const createTemplate = (templateData) => {
    const action = templateData.rejectionReason ? 'rejected' : 'approved';

    let template = `
   </p> Hello <b>${templateData.bookedByName}</b>,</p>
   </br>
   <p>
    Your seat booking request <b>#${templateData.requestId}</b> for seat <b>#${
        templateData.seatNo
    }</b> for 
    ${addSectionAndOrdinalToTheFloor(templateData.floorNo)}, ${
        templateData.facilityName
    }
   <b> ${messageOnDates(templateData.fromDate, templateData.toDate)} </b>
    has been ${action} REJECTED_MESSAGE_PLACEHOLDER APPROVED_MESSAGE_PLACEHOLDER
    </p>`;

    if (templateData.rejectionReason) {
        const rejectedBy =
            templateData.rejectionLevel === APPROVAL_LEVEL.L1
                ? 'by your reporting manager'
                : 'by the facility manager';
        const rejectionMessageChunk = `${rejectedBy} with the below mentioned reason - </br>
        <p>"${templateData.rejectionReason}"<p>`;
        template = template.replace('APPROVED_MESSAGE_PLACEHOLDER', '');
        template = template.replace(
            'REJECTED_MESSAGE_PLACEHOLDER',
            rejectionMessageChunk
        );
    } else {
        template = template.replace('REJECTED_MESSAGE_PLACEHOLDER', '');
        template = template.replace(
            'APPROVED_MESSAGE_PLACEHOLDER',
            '. Your seat has been confirmed.'
        );
    }

    if (
        templateData.isBulkAdminCancellation &&
        templateData.rejectionLevel === REQUEST_STATUS.ADMIN_BULK_CANCELLATION
    ) {
        template = `
        </p> Hello,</p>
        </br>
        <p>
        Your seat booking request on 
        ${addSectionAndOrdinalToTheFloor(templateData.floorNo)}, ${
            templateData.facilityName
        }
        ${messageOnDates(templateData.fromDate, templateData.toDate)}
        has been cancelled due to some unforeseeable circumstances.
        </p>
        <p>Cancellation remarks - ${templateData.rejectionReason}</p>`;
    }

    return template;
};

const createSubject = (templateData) => {
    let bulk = '';
    if ((templateData.selectedSeats || []).length > 1) {
        bulk = 'Bulk';
    }
    let subject = `${bulk} Seat Booking Request #${templateData.requestId} - `;
    if (templateData.isBulkAdminCancellation) {
        subject += 'cancelled by facility manager';
    } else if (templateData.rejectionReason) {
        const rejectionLevelRole =
            templateData.rejectionLevel === APPROVAL_LEVEL.L1
                ? 'your manager'
                : 'facility manager';
        subject += `Rejected by ${rejectionLevelRole}`;
    } else {
        subject += 'Approved and confirmed';
    }
    return subject;
};

const createSeatAllocationDetails = (selectedSeats) => {
    if (selectedSeats && !selectedSeats.length) {
        return 'Seat allocation details not available';
    }

    let seatAllocationTeplate = '<br>';

    seatAllocationTeplate +=
        '<table style="border: 1px solid black;border-collapse: collapse;">' +
        '<thead style="background-color:#6186b3; color:white">' +
        '<th style="border: 1px solid black;border-collapse: collapse;padding: 15px;"> Employee Id </th>' +
        '<th style="border: 1px solid black;border-collapse: collapse;padding: 15px;"> Employee Name </th>' +
        '<th style="border: 1px solid black;border-collapse: collapse;padding: 15px;"> Seat Number </th>' +
        '</thead>';
    for (const seatDetail of selectedSeats) {
        seatAllocationTeplate += `<tr> 
        <td style="border: 1px solid black;border-collapse: collapse;padding: 15px;"> 
        ${seatDetail.bookedFor.toUpperCase()}
        </td> 
        <td style="border: 1px solid black;border-collapse: collapse;padding: 15px;"> 
        ${seatDetail.bookedForName}
        </td> 
        <td style="border: 1px solid black;border-collapse: collapse;padding: 15px;">
        ${seatDetail.seatNo}
        </td>
        </tr>`;
    }
    return seatAllocationTeplate;
};

const createTeamBookingTemplate = (templateData) => {
    const action = templateData.rejectionReason ? 'rejected' : 'approved';
    let template = `${
        action === 'rejected'
            ? `Hello,  ${templateData.bookedByName}`
            : 'Hello,'
    }
   <p>
    Your bulk seat booking request <b>#${templateData.requestId}</b> for ${
        templateData.selectedSeats.length
    } seats on 
    ${addSectionAndOrdinalToTheFloor(templateData.floorNo)}, ${
        templateData.facilityName
    }  ${messageOnDates(templateData.fromDate, templateData.toDate)}
    has been ${action}REJECTED_MESSAGE_PLACEHOLDER APPROVED_MESSAGE_PLACEHOLDER
        SEAT_CONFIRM_OR_REJECT_MESSAGE_PLACEHOLDER
        </br>
        SEAT_ALLOCATION_DETAILS_PLACEHOLDER
    </p>`;

    template = template.replace(
        'SEAT_ALLOCATION_DETAILS_PLACEHOLDER',
        createSeatAllocationDetails(templateData.selectedSeats)
    );

    if (templateData.rejectionReason) {
        const rejectedBy =
            templateData.rejectionLevel === APPROVAL_LEVEL.L1
                ? 'by your immediate manager'
                : 'by the facility manager';
        const rejectionMessageChunk = `${rejectedBy} with below mentioned rejection reason - </br>
        <p>"${templateData.rejectionReason}"<p>`;
        template = template.replace('APPROVED_MESSAGE_PLACEHOLDER', '');
        template = template.replace(
            'REJECTED_MESSAGE_PLACEHOLDER',
            rejectionMessageChunk
        );
        template = template.replace(
            'SEAT_CONFIRM_OR_REJECT_MESSAGE_PLACEHOLDER',
            'You had requested booking on following seats -'
        );
    } else {
        template = template.replace('REJECTED_MESSAGE_PLACEHOLDER', '');
        template = template.replace(
            'SEAT_CONFIRM_OR_REJECT_MESSAGE_PLACEHOLDER',
            ''
        );
        template = template.replace(
            'APPROVED_MESSAGE_PLACEHOLDER',
            '. Following seats for your team members have been confirmed.'
        );
    }

    if (
        templateData.isBulkAdminCancellation &&
        templateData.rejectionLevel === REQUEST_STATUS.ADMIN_BULK_CANCELLATION
    ) {
        template = `
        </p> Hello team,</p>
        </br>
        <p>
        Your seat booking request for #${templateData.seatNo} on 
        ${addSectionAndOrdinalToTheFloor(templateData.floorNo)}, ${
            templateData.facilityName
        }
        <b>${messageOnDates(templateData.fromDate, templateData.toDate)}</b>
        has been cancelled due to some unforeseen situation.
        </p>
        <p>"${templateData.rejectionReason}"</p>`;
    }

    return template;
};

async function sendMail(mailMetaData) {
    if (!mailMetaData) {
        throw new ErrorClass('Missing required mail metadata', 400);
    }

    if (!mailMetaData.to) {
        throw new ErrorClass(
            'Invalid request. Required attributes missing from send email payload',
            400
        );
    }

    const { to, cc } = mailMetaData;
    const mailJob = mailerQueue.createJob({
        from: '"Book My Seats App" <noreply@gslab.com>', // sender address
        to: isArray(to) ? (to || []).join(',') : to,
        cc: isArray(cc) ? (cc || []).join(',') : cc,
        subject: createSubject(mailMetaData),
        html: `${
            (mailMetaData.selectedSeats || []).length > 1
                ? createTeamBookingTemplate(mailMetaData)
                : createTemplate(mailMetaData)
        } ${MAIL_FOOTER}`,
    });

    mailJob.save().then((job1) => {
        console.log(job1.id, 'mailMeta data is saved and queued');
    });
    mailJob.on('progress', (progress) => {
        console.log(`Job ${mailJob.id} mailMeta data reported`);
        console.log(progress);
    });
    mailJob.on('failed', (err) => {
        console.log(
            `SendMail Job ${mailJob.id} failed with error ${err.message}`
        );
    });
    mailJob.on('retrying', (err) => {
        console.log(
            `SendMail Job ${mailJob.id} failed with error ${err.message} but is being retried!`
        );
    });
    mailJob.on('succeeded', () => {
        console.log(`SendMail Job ${mailJob.id} succeeded`);
    });
}

try {
    mailerQueue.process(async (job) => {
        const info = await transporter.sendMail(job.data);
        console.log('Message sent: %s', info.messageId);
    });
} catch (error) {
    throw new ErrorClass(
        error.message || 'Something went wrong while executing:: sendMail()',
        500
    );
}

module.exports = {
    sendMail,
    sendMailToEmployee,
};
