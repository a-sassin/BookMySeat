export const facilityList: FacilityListModel[] = [
    {
        facilityName: 'AAG',
        facilityID: 'AAG',
        floors: [
            {
                value: '2',
                viewValue: '2nd Floor',
            },
            {
                value: '3',
                viewValue: '3rd Floor',
            },
            {
                value: '4',
                viewValue: '4th Floor',
            },
            {
                value: '8A',
                viewValue: '8th Floor, Section-A',
            },
            {
                value: '8B',
                viewValue: '8th Floor, Section-B',
            },
        ],
    },
    {
        facilityName: 'VANTAGE',
        facilityID: 'V9',
        floors: [
            {
                value: '7',
                viewValue: '7th Floor',
            },
            {
                value: '8',
                viewValue: '8th Floor',
            },
        ],
    },
];

export interface FacilityListModel {
    facilityName: string;
    facilityID: string;
    floors: Floor[];
}
export interface Floor {
    value: string;
    viewValue: string;
}

export const facilityWiseName = { AAG: 'AAG', V9: 'VANTAGE', AI: 'ADISA' };
