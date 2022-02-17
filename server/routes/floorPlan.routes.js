const auth = require('../middleware/auth');
const controller = require('../controllers/floorPlan.controller');

module.exports = (router) => {
    /**
     * @swagger
     *
     * tags:
     *   - name: Floor Plan
     *
     */

    /**
     * @swagger
     *
     * /floor-plan:
     *   get:
     *     summary: Floor Plan API
     *     description: This API is for get floor plan
     *     tags:
     *       - Floor Plan
     *     parameters:
     *       - name: floorNo
     *         in: query
     *         description: this is the floor number
     *         schema:
     *           type: int
     *           example: 3
     *       - name: facilityId
     *         in: query
     *         description: this is the faciityId
     *         schema:
     *           type: string
     *           example: AAG
     *       - name: queryDate
     *         in: query
     *         description: this is the query date
     *         schema:
     *           type: string
     *           example: 2021-03-11T18:30:00.000Z
     *     responses:
     *       200:
     *         description: This will notify successfull implementation of query
     *         content:
     *           application/json:
     *              schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: string
     *                   example: 200
     *                 data:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       _id:
     *                         type: string
     *                         example: 604a16028ca3af925ad9e4cb
     *                       floorId:
     *                         type: string
     *                         example: 604a16028ca3af925ad9e4ca
     *                       assignedPractice:
     *                         type: string
     *                         example: CIS
     *                       facilityName:
     *                         type: string
     *                         example: Amar Arma Genesis
     *                       facilityId:
     *                         type: string
     *                         example: AAG
     *                       floorNo:
     *                         type: string
     *                         example: 3
     *                       listingData:
     *                         type: array
     *                         items:
     *                           type: object
     *                           properties:
     *                             _id:
     *                               type: string
     *                               example: 604a16028ca3af925ad9e4cb
     *                             listingDate:
     *                               type: string
     *                               example: 2021-03-11T18:30:00.000Z
     *                             totalSeatsCount:
     *                               type: string
     *                               example: 60
     *                             availableSeatsCount:
     *                               type: string
     *                               example: 60
     *                             blockedSeatsCount:
     *                               type: string
     *                               example: 0
     *                             bookedSeatsCount:
     *                               type: string
     *                               example: 0
     *                             isFloorAvailableForBooking:
     *                               type: boolean
     *                               example: true
     *                             seats:
     *                               type: array
     *                               items:
     *                                 type: object
     *                                 properties:
     *                                   status:
     *                                     type: string
     *                                     example: available
     *                                   _id:
     *                                     type: string
     *                                     example: 604a16238ca3af925ad9e546
     *                                   seatNo:
     *                                     type: int
     *                                     example: 3003
     *                                   coordinates:
     *                                     type: string
     *                                     example: 354,367,393,411
     *                                   socialDistancingEnabled:
     *                                     type: boolean
     *                                     example: false
     *                                   seatId:
     *                                     type: string
     *                                     example: 604a16238ca3af925ad9e50a
     *                                   bookedBy:
     *                                     type: string
     *                                     example: null
     *                                   bookedFrom:
     *                                     type: string
     *                                     example: null
     *                                   bookedTo:
     *                                     type: string
     *                                     example: null
     *                       createdAt:
     *                         type: string
     *                         example: 2021-03-11T13:07:14.067Z
     *                       updatedAt:
     *                         type: string
     *                         example: 2021-03-11T13:07:14.067Z
     *                       _v:
     *                         type: int
     *                         example: 0
     *       400:
     *         description: Bad Request
     *         content:
     *           application/json:
     *              schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: int
     *                   example: 400
     *                 message:
     *                   type: string
     *                   example: Invalid query params
     */
    router.route('/floor-plan').get(auth, controller.getFloorPlan);

    /**
     * @swagger
     *
     * /floor-plan:
     *   post:
     *     summary: Add Floor Plan API
     *     description: This API is for adding floor plan
     *     tags:
     *       - Floor Plan
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               assignedPractice:
     *                 type: string
     *                 example: CIS
     *               facilityName:
     *                 type: string
     *                 example: Amar Arma Genesis
     *               facilityId:
     *                 type: string
     *                 example: AAG
     *               floorNo:
     *                 type: string
     *                 example: 3
     *               listingData:
     *                 type: array
     *                 items:
     *                   type: object
     *                   properties:
     *                      listingDate:
     *                        type: string
     *                        example: 2021-03-11T18:30:00.000Z
     *                      totalSeatsCount:
     *                        type: string
     *                        example: 60
     *                      availableSeatsCount:
     *                        type: string
     *                        example: 60
     *                      blockedSeatsCount:
     *                        type: string
     *                        example: 0
     *                      bookedSeatsCount:
     *                        type: string
     *                        example: 0
     *                      isFloorAvailableForBooking:
     *                        type: boolean
     *                        example: true
     *                      seats:
     *                        type: array
     *                        items:
     *                          type: object
     *                          properties:
     *                            seatNo:
     *                              type: int
     *                              example: 3003
     *                            coordinates:
     *                              type: string
     *                              example: 354,367,393,411
     *                            socialDistancingEnabled:
     *                              type: boolean
     *                              example: false
     *     responses:
     *       201:
     *         description: This will notify successfull implementation of query
     *         content:
     *           application/json:
     *              schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Floor plan saved successfully.
     *       500:
     *         description: Internal Server Error
     *         content:
     *           application/json:
     *              schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: something went wrong
     *                 error:
     *                   type: object
     *                   example: {}
     */
    router.route('/floor-plan').post(auth, controller.newFloorPlan);

    router.route('/floor-map').post(auth, controller.createFloorMap);

    router.route('/floor-map').patch(auth, controller.updateFloorMap);

    router
        .route('/floor-plan/approvedSeatsSummary')
        .get(auth, controller.getApprovedSeatsSummary);
    router
        .route(
            '/floor-plan/approvedSeatsSummaryDetails/:facilityId/:floorNo/:queryDate'
        )
        .get(auth, controller.getApprovedSeatsSummaryDetails);
};
