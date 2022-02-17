const ActiveDirectory = require('activedirectory');
const { isArray } = require('core-js/fn/array');
const { AD_ACCOUNT_DISABLED } = require('../constants/constants');

const config = {
    url: process.env.AD_URL,
    baseDN: process.env.BASE_DN,
    username: process.env.AD_USERNAME,
    password: process.env.AD_PASSWORD,
    attributes: {
        user: [
            'sAMAccountName',
            'cn',
            'name',
            'displayName',
            'mail',
            'title',
            'manager',
            'gs-Project',
            'department',
            'ou',
            'directReports',
            'userAccountControl',
        ],
    },
};

const activeDirectory = new ActiveDirectory(config);

const getEmpDetails = async (employeeId) => {
    return new Promise((resolve, reject) =>
        activeDirectory.findUser(employeeId, async (err, empAdDetails) => {
            if (err) reject(err);
            if (empAdDetails) {
                try {
                    const manager = await getEmpDetail(empAdDetails.manager);
                    const details = {
                        name: empAdDetails.cn,
                        empId: empAdDetails.sAMAccountName.toLowerCase(),
                        email: empAdDetails.mail || null,
                        department: empAdDetails.department || '',
                        designation: empAdDetails.title || '',
                        practice: empAdDetails.ou || '',
                        project: empAdDetails['gs-Project'] || '',
                        manager: manager.sAMAccountName.toLowerCase(),
                    };
                    const employeeDetails = { subordinates: [] };
                    await getSubordinates(employeeDetails, empAdDetails);
                    employeeDetails.subordinates =
                        employeeDetails.subordinates.map((emp) => {
                            return {
                                name: emp.name,
                                empId: emp.sAMAccountName,
                                email: emp.mail,
                            };
                        });
                    details.subordinates = employeeDetails.subordinates;
                    resolve(details);
                } catch (error) {
                    reject(error);
                }
            }
        })
    );
};

async function getSubordinates(employeeDetails, employeeDetailsAD) {
    let subordinates = employeeDetailsAD.directReports;
    if (subordinates && subordinates.length) {
        subordinates = isArray(subordinates) ? subordinates : [subordinates];
        await Promise.all(
            subordinates.map(async (sub) =>
                getSubsRecursively(sub, employeeDetails)
            )
        );
    }
}

function getSubsRecursively(sub, employeeDetails) {
    return new Promise((resolve, reject) =>
        activeDirectory.findUser(sub, async (err, subordinate) => {
            if (err) reject(err);
            if (
                subordinate &&
                subordinate.userAccountControl !== AD_ACCOUNT_DISABLED
            ) {
                employeeDetails.subordinates.push(subordinate);
                await getSubordinates(employeeDetails, subordinate);
            }
            resolve(subordinate);
        })
    );
}

function getEmpDetail(query) {
    return new Promise((resolve, reject) =>
        activeDirectory.findUser(query, (err, user) => {
            if (err) reject(err);
            if (!user) {
                reject(new Error('Employee details not found'));
            }
            resolve(user);
        })
    );
}

const ad = () => {
    return activeDirectory;
};

module.exports = {
    ad,
    getEmpDetails,
    getEmpDetail,
    getSubordinates,
};
