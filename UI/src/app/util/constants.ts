export const FLOOR_MAPPING_BY_PRACTICE = {
    IDM: [
        {
            floorNo: '2',
            facilityId: 'AAG',
            displayValue: '2nd Floor (AAG)',
            imagePath: 'assets/Floor2.jpg',
        },
        {
            floorNo: '7',
            facilityId: 'V9',
            displayValue: '7th Floor (VANTAGE)',
            imagePath: 'assets/Floor7.jpg',
        },
        {
            floorNo: '8',
            facilityId: 'V9',
            displayValue: '8th Floor (VANTAGE)',
            imagePath: 'assets/Floor8.jpg',
        },
    ],
    IBM: [
        {
            floorNo: '2',
            facilityId: 'AAG',
            displayValue: '2nd Floor (AAG)',
            imagePath: 'assets/Floor2.jpg',
        },
        {
            floorNo: '7',
            facilityId: 'V9',
            displayValue: '7th Floor (VANTAGE)',
            imagePath: 'assets/Floor7.jpg',
        },
        {
            floorNo: '8',
            facilityId: 'V9',
            displayValue: '8th Floor (VANTAGE)',
            imagePath: 'assets/Floor8.jpg',
        },
    ],
    CIS: [
        {
            floorNo: '3',
            facilityId: 'AAG',
            displayValue: '3rd Floor (AAG)',
            imagePath: 'assets/Floor3.jpg',
        },
    ],
    CE: [
        {
            floorNo: '4',
            facilityId: 'AAG',
            displayValue: '4th Floor (AAG)',
            imagePath: 'assets/Floor4.jpg',
        },
        {
            floorNo: '8B',
            facilityId: 'AAG',
            displayValue: '8th Floor, Section B (AAG)',
            imagePath: 'assets/Floor8b.jpg',
        },
    ],
    'CORP SERVICES': [
        {
            floorNo: '8A',
            facilityId: 'AAG',
            displayValue: '8th Floor, Section A (AAG)',
            imagePath: 'assets/Floor8a.jpg',
        },
    ],
    SUPER_ADMIN_FLOORS: [
        {
            floorNo: '2',
            facilityId: 'AAG',
            displayValue: '2nd Floor (AAG)',
            imagePath: 'assets/Floor2.jpg',
        },
        {
            floorNo: '7',
            facilityId: 'V9',
            displayValue: '7th Floor (VANTAGE)',
            imagePath: 'assets/Floor7.jpg',
        },
        {
            floorNo: '8',
            facilityId: 'V9',
            displayValue: '8th Floor (VANTAGE)',
            imagePath: 'assets/Floor8.jpg',
        },
        {
            floorNo: '3',
            facilityId: 'AAG',
            displayValue: '3rd Floor (AAG)',
            imagePath: 'assets/Floor3.jpg',
        },
        {
            floorNo: '4',
            facilityId: 'AAG',
            displayValue: '4th Floor (AAG)',
            imagePath: 'assets/Floor4.jpg',
        },
        {
            floorNo: '8B',
            facilityId: 'AAG',
            displayValue: '8th Floor, Section B (AAG)',
            imagePath: 'assets/Floor8b.jpg',
        },
        {
            floorNo: '8A',
            facilityId: 'AAG',
            displayValue: '8th Floor, Section A (AAG)',
            imagePath: 'assets/Floor8a.jpg',
        },
    ],
};

export const PRACTICE_NAME_BY_FLOOR = {
    IDM: ['2', '7', '8'],
    CIS: ['3'],
    CE: ['4', '8B'],
    'CORP SERVICES': ['8A'],
};

export const FLOOR_MAPPING_TO_NAME = {
    1: '1st Floor',
    2: '2nd Floor',
    3: '3rd Floor',
    4: '4th Floor',
    5: '5th Floor',
    6: '6th Floor',
    7: '7th Floor',
    8: '8th Floor',
    '8A': '8th Floor(Section-A)',
    '8B': '8th Floor(Section-B)',
};

export enum SOCKET_EVENTS {
    PENDING = 'pending_requests',
    ACTIONED = 'actioned_upon',
    NEW = 'new_request',
}

// Vaccination and non-vaccination color codes
export enum VACCINATION_STATUS {
    vaccinatedStyle = 'color: #06a125;font-weight: 500',
    notVaccinatedStyle = 'color: #c40000;font-weight: 500',
}

//facility name for color code
export enum FACILITY_NAME {
    aag = 'AAG',
    adisa = 'ADISA',
    vantage = 'VANTAGE',
}

export const MAX_DATE_BOOKING = 30;

export const ANONYMOUS_ERROR = 'Something went wrong';
export const INVALID_BLOCKING_REMARK =
    'Please enter a valid remark for blocking';
export const INVALID_REJECTION_REMARK =
    'Please enter a valid remark for request rejection';

export const INDEFINITE_DATE = '31-12-2050';
export const SEREVR_INDEFINITE_DATE = '2050-12-31T00:00:00.000Z';

export const FACILITY_PRACTICES = ['IDM', 'CIS', 'CE', 'CORP SERVICES'];

export const EXTRA_FACILITY_PRACTICES = ['SERVICESOPS'];

export const RESPONSIBILTY_ASSIGN = [
    'Seat booking approver',
    'Visit booking approver',
];
export const NO_REASON = '-';

export const L1_ROLES = [
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
    'Lead Facility Administrator',
    'Lead IT Administrator',
    'Lead HR Analyst',
];

export const CATEGORY_ID = [
    'Payroll',
    'Finance',
    'Sysad',
    'Facility',
    'IT',
    'Talent management',
];

export const FACILITY_MAPPING = { AAG: 'AAG', V9: 'VANTAGE' };
