const auth = require('../middleware/auth');
const controller = require('../controllers/facilityAdmin.controller');

module.exports = (router) => {
    router.route('/facilityAdmin').get(auth, controller.listFacilityAdmins);
    router
        .route('/facilityAdmin/:empId')
        .delete(auth, controller.removeFacilityAdmin);
    router.route('/facilityAdmin').put(auth, controller.addFacilityAdmin);
};
