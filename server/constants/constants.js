const moment = require('moment');

exports.ALLOWED_MAX_FUTURE_DAYS = 30;

exports.SUPPORTED_FACILITIES = ['AAG', 'V9', 'AI', 'KP', 'VD'];

exports.SUPPORTED_PRACTICES = ['IDM', 'CE', 'CIS', 'CORP SERVICES'];

exports.EXTRA_PRACTICES = ['SERVICESOPS'];

exports.REQUIRED_NEW_BOOKING_PAYLOAD = {
    empId: true,
    practice: true,
    facilityName: true,
    facilityId: true,
    floorNo: true,
    fromDate: true,
    floorId: true,
    toDate: true,
    title: true,
    requestSummary: true,
    bookedByName: true,
    selectedSeats: true,
    L1Approver: false,
    vaccinationStatus: true,
};

exports.SEAT_STATUS = Object.freeze({
    AVAILABLE: 'available',
    UNAVAILABLE: 'unavailable',
    BLOCKED: 'blocked',
    BOOKED: 'booked',
    RESERVED: 'reserved',
});

exports.REQUEST_STATUS = Object.freeze({
    PENDING_L1: 'pending-L1',
    PENDING_L2: 'pending-L2',
    REJECTED_L1: 'rejected-L1',
    REJECTED_L2: 'rejected-L2',
    APPROVED: 'approved',
    CANCELLED: 'cancelled',
    AUTO_CANCELLED: 'auto-cancelled',
    ADMIN_BULK_CANCELLATION: 'unforeseen-reasons-facility-admin-bulk-cancelled',
});

exports.REQUEST_ACTION = Object.freeze({
    REJECTED: 'rejected',
    APPROVED: 'approved',
    CANCELLED: 'cancelled',
});

exports.APPROVAL_LEVEL = Object.freeze({
    L0: 'L0',
    L1: 'L1',
    L2: 'L2',
});

exports.BLOCK_STATUS = Object.freeze({
    BLOCKED: 'blocked',
    UNBLOCKED: 'unblocked',
});

exports.FACILITY_ADMIN = ['GS-LFA01', 'GS-0888'];

exports.FACILITY_ADMIN_ROLES = Object.freeze({
    BOOK_SEAT_APPROVER: 'Seat booking approver',
    BOOK_VISIT_APPROVER: 'Visit booking approver',
});

exports.L1_REQUIRED = [
    'Intern',
    'Software Engineer',
    'Senior Software Engineer',
    'Lead Software Engineer',
    'Support Engineer',
    'Data Engineer',
    'Technical Writer',
    'Senior Solutions Engineer',
    'Senior Support Engineer',
    'Senior Data Scientist',
    'Senior Data Engineer',
    'Senior Technical Writer',
    'Lead Support Engineer',
    'Lead Data Scientist',
    'Lead UX Designer',
    'Lead Technical Writer',
    'Lead Business Development',
    'Officer Finance',
    'IT Administrator',
    'HR Analyst',
    'Senior Officer Finance',
    'Senior Officer Legal',
    'Senior Facility Administrator',
    'Senior IT Administrator',
    'Senior HR Analyst',
    'Lead Officer Finance',
    'Lead IT Administrator',
    'Lead HR Analyst',
];

exports.ONLY_ALLOW_ALPHANUMERIC_REGEX = /^([0-9]|[a-z])+([0-9a-z]+)$/i;

exports.INDEFINITE_PERIOD = '31-12-2050';

exports.VISIT_MIN_DATE = moment()
    .add(-6, 'M')
    .hour(0)
    .minute(0)
    .seconds(0)
    .format();

exports.VACCINATION_STATUS = Object.freeze({
    DONE: 'Done',
    PENDING: 'Pending',
});

exports.DATE_FORMAT = 'DD-MM-YYYY';

exports.VISIT_REQ_STATUS = Object.freeze({
    PENDING: 'pending',
    REJECTED: 'rejected',
    APPROVED: 'approved',
    CANCELLED: 'cancelled',
});

const mail = 'gs.atm03@mailinator.com';
exports.CATEGORY_EMAILS =
    process.env.ENVIRONMENT === 'prod'
        ? Object.freeze({
              Payroll: 'payroll@gslab.com',
              Sysad: 'sysad@gslab.com',
              IT: 'it-applications@gslab.com',
              'Talent management': 'talentmanagement@gslab.com',
              Facility: 'facility@gslab.com',
              Finance: 'finance@gslab.com',
              Other: 'sharad.dubey@gslab.com',
          })
        : Object.freeze({
              Payroll: mail,
              Sysad: mail,
              IT: mail,
              'Talent management': mail,
              Facility: mail,
              Finance: mail,
              Other: mail,
          });

exports.MAIL_FOOTER =
    '<p>If you are connected to GSLAB VPN <a href="https://bms.gslab.com">Click here</a> or else <a href="https://bms.gslab.com:5002">Click here</a> to visit BookMySeat application. </p><p>In case of queries get in touch with facility team.</p><br><p>Regards<br>Facility Team.</p><br><p>** This is an auto-generated email. Please do not reply to this email.**</p>';

exports.FLOOR_MAILS =
    process.env.ENVIRONMENT === 'prod'
        ? Object.freeze({
              8: 'all-vantage9@gslab.com',
              7: 'all-vantage9@gslab.com',
              '8A': 'corp_services@gslab.com',
              4: 'connected-experience@gslab.com ',
              '8B': 'connected-experience@gslab.com ',
              3: 'cis-all@gslab.com',
              2: 'idm@gslab.com',
          })
        : Object.freeze({
              8: mail,
              7: mail,
              '8A': mail,
              4: mail,
              '8B': mail,
              3: mail,
              2: mail,
          });

exports.FACILITY_NAMES = Object.freeze({
    AAG: 'Amar Arma Genesis',
    V9: 'Vantage',
});

exports.AD_ACCOUNT_DISABLED = '514';
