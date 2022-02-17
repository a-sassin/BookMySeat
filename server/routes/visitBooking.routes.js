const auth = require('../middleware/auth');
const controller = require('../controllers/visitBooking.controller');

module.exports = (router) => {
    // New visit booking
    router.route('/visits').post(auth, controller.createVisitBooking);

    // Get visit booking history
    router.route('/visits/bookings').get(auth, controller.getVisitBooking);

    // Get visit pending request history
    router
        .route('/visits/pending-approval')
        .get(auth, controller.getPendingVisitBookings);

    // Action(cancel/approve) on visit booking requests
    router.route('/visits/action').post(auth, controller.actionOnVisitBooking);

    // Get approved seat summary
    router
        .route('/visits/approvedVisitSummary')
        .get(auth, controller.getApprovedVisitSummary);

    // Download approved visit summary
    router
        .route('/visits/bookings/download')
        .get(auth, controller.downloadVisitBookings);
};
