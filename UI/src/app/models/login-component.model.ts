export interface LoginRequestPayload {
    empId: string;
    password: string;
    keepMeSignedIn: boolean;
}

export interface LoginResponse {
    data: LoginData;
}

export interface LoginData {
    name: string;
    empId: string;
    email: string;
    subordinates: UserSubordinate[];
    department: string;
    designation: string;
    practice: string;
    project: string;
    token: string;
    manager: string;
    approvalLevel: string;
    roles: string[];
    assignedPractices: string[];
    isSuperAdmin: boolean;
    isFirstTimeLogin: boolean;
}

export interface UserSubordinate {
    name: string;
    empId: string;
}

export interface UserSessionData {
    token: string;
    empId: string;
    empName: string;
    manager: string;
    title: string;
    hasSubordinates: boolean;
    email: string;
    designation: string;
    practice: string;
    subordinates: UserSubordinate[];
    approvalLevel: string;
    roles: string[];
    assignedPractices: string[];
    isSuperAdmin: boolean;
    isFirstTimeLogin: boolean;
}

export interface EmployeeSessionData {
    IDM: EmployeeData[];
    CIS: EmployeeData[];
    CE: EmployeeData[];
    'CORP SERVICES': EmployeeData[];
}

export interface EmployeeData {
    email?: string;
    name: string;
    empId: string;
    self?: boolean;
}
