const bookSeats = require('./bookSeats.routes');
const employee = require('./employee.routes');
const floorPlan = require('./floorPlan.routes');
const blockDates = require('./blockFacility.routes');
const facilityAdmins = require('./facilityAdmin.routes');
const visitBooking = require('./visitBooking.routes');

module.exports = (router) => {
    bookSeats(router);
    employee(router);
    floorPlan(router);
    blockDates(router);
    facilityAdmins(router);
    visitBooking(router);
    return router;
};
