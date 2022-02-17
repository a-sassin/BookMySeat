const auth = require('../middleware/auth');
const controller = require('../controllers/bookSeats.controller');

module.exports = (router) => {
    /**
     * @swagger
     *
     * tags:
     *   - name: Book Seats
     *
     */

    /**
     * @swagger
     *
     * /book-seats:
     *   post:
     *     summary: Book Seats API
     *     description: This API is for booking seats.
     *     tags:
     *       - Book Seats
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               empId:
     *                 type: string
     *                 example: gs-lse-01
     *               practice:
     *                 type: string
     *                 example: IDM
     *               floorNo:
     *                 type: string
     *                 example: 2
     *               floorId:
     *                 type: string
     *                 example: 6036223f5fc5bf7736628a06
     *               facilityName:
     *                 type: string
     *                 example: AAG
     *               selectedSeats:
     *                 type: array
     *                 items:
     *                   type: object
     *                   properties:
     *                     seatId:
     *                       type: string
     *                       example: 6036230e5fc5bf773662906e
     *                     seatNo:
     *                        type: int
     *                        example: 2001
     *                     bookedFor:
     *                        type: string
     *                        example: gs-lse-01
     *                     bookedForName:
     *                        type: string
     *                        example: Associate Technical Manager
     *                     bokedBy:
     *                        type: string
     *                        example: gs-lse-01
     *               fromDate:
     *                 type: string
     *                 example: 2021-03-23T18:30:00.000+00:00
     *               toDate:
     *                 type: string
     *                 example: 2021-03-23T18:30:00.000+00:00
     *               requestSummary:
     *                 type: string
     *                 example: testing
     *               L1Approver:
     *                 type: string
     *                 example: GS-ATM-01
     *               title:
     *                 type: string
     *                 example: Associate Technical Manager
     *     responses:
     *       200:
     *         description: This will notify successfull implementation of query
     *         content:
     *           application/json:
     *              schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: int
     *                   example: 200
     *                 data:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       message:
     *                         type: string
     *                         example: executed
     *                       requestId:
     *                         type: string
     *                         example: 1234
     *       400:
     *         description: Bad Request
     *         content:
     *           application/json:
     *              schema:
     *               type: object
     *               properties:
     *                 error:
     *                   type: object
     *                   example: {}
     *
     */

    router.route('/book-seats').post(auth, controller.newBooking);

    /**
     * @swagger
     *
     * /book-seats/booking:
     *   get:
     *     summary: Single Booking detail API
     *     description: This API is for getting single booking details.
     *     tags:
     *       - Book Seats
     *     parameters:
     *       - name: requestId
     *         in: query
     *         description: this is the request id
     *         schema:
     *           type: int
     *           example: 57841558
     *     responses:
     *       200:
     *         description: This will notify successfull implementation of query
     *         content:
     *           application/json:
     *              schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: int
     *                   example: 200
     *                 data:
     *                   type: object
     *                   properties:
     *                     currentStatus:
     *                       type: string
     *                       example: pending-L1
     *                     isL1Required:
     *                       type: boolean
     *                       example: true
     *                     empId:
     *                       type: string
     *                       example: gs-lse-01
     *                     practice:
     *                       type: string
     *                       example: IDM
     *                     facilityName:
     *                       type: string
     *                       example: AAF
     *                     floorNo:
     *                       type: int
     *                       example: 2
     *                     floorId:
     *                       type: string
     *                       example: 60391eee1a1d0c00bbe763d6
     *                     selectedSeats:
     *                       type: array
     *                       items:
     *                         type: object
     *                         properties:
     *                           _id:
     *                             type: string
     *                             example: 6040986b80fd2f312205aa16
     *                           seatId:
     *                             type: string
     *                             example: 60406f351977781b8d2be1a5
     *                           seatNo:
     *                             type: int
     *                             example: 2001
     *                           bookedFor:
     *                             type: string
     *                             example: gs-0858
     *                           bookedForName:
     *                             type: string
     *                             example: Pankaj Khamkar
     *                           bookedBy:
     *                             type: string
     *                             example: gs-lse-01
     *                     fromDate:
     *                       type: string
     *                       example: 2021-03-17T18:30:00.000Z
     *                     toDate:
     *                       type: string
     *                       example: 2021-03-17T18:30:00.000Z
     *                     requestSummary:
     *                       type: string
     *                       example: testing
     *                     L1Approver:
     *                       type: string
     *                       example: gs-lse-01
     *                     title:
     *                       type: string
     *                       example: Senior Software Engineer
     *                     actionNote:
     *                       type: string
     *                       example:
     *                     requestId:
     *                       type: string
     *                       example: 17661443
     *                     L2Approver:
     *                       type: string
     *                       example: gs-0888
     *       400:
     *         description: Bad Request
     *         content:
     *           application/json:
     *              schema:
     *               type: object
     *               properties:
     *                 error:
     *                   type: object
     *                   example: {}
     *
     */
    router.route('/book-seats/booking').get(auth, controller.getBooking);

    /**
     * @swagger
     *
     * /book-seats/bookings:
     *   get:
     *     summary: Multiple Booking Detail API
     *     description: This API is for getting multiple booking.
     *     tags:
     *       - Book Seats
     *     parameters:
     *       - name: requesterId
     *         in: query
     *         description: this is the requester id
     *         schema:
     *           type: string
     *           example: loggedinUser
     *       - name: offset
     *         in: query
     *         description: this is offset value
     *         schema:
     *           type: int
     *           example: 0
     *       - name: limit
     *         in: query
     *         description: this is the limit
     *         schema:
     *           type: int
     *           example: 10
     *       - name: orderBy
     *         in: query
     *         description: this is orderBy value
     *         schema:
     *           type: string
     *           example: fromDate
     *       - name: sortOrder
     *         in: query
     *         description: this is the sorting selector
     *         schema:
     *           type: string
     *           example: desc
     *     responses:
     *       200:
     *         description: This will notify successfull implementation of query
     *         content:
     *           application/json:
     *              schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: int
     *                   example: 200
     *                 data:
     *                   type: string
     *                   example: executed
     *       400:
     *         description: Bad Request
     *         content:
     *           application/json:
     *              schema:
     *               type: object
     *               properties:
     *                 error:
     *                   type: object
     *                   example: {}
     *
     */

    router.route('/book-seats/bookings').get(auth, controller.getBookings);

    /**
     * @swagger
     *
     * /book-seats/approvalBookings:
     *   get:
     *     summary: Pending request API
     *     description: This API is for getting pending request.
     *     tags:
     *       - Book Seats
     *     parameters:
     *       - name: approverId
     *         in: query
     *         description: this is the approver id
     *         schema:
     *           type: string
     *           example: gs-lse-01
     *       - name: offset
     *         in: query
     *         description: this is offset value
     *         schema:
     *           type: int
     *           example: 0
     *       - name: limit
     *         in: query
     *         description: this is the limit
     *         schema:
     *           type: int
     *           example: 10
     *       - name: orderBy
     *         in: query
     *         description: this is orderBy value
     *         schema:
     *           type: string
     *           example: requestId
     *       - name: sortOrder
     *         in: query
     *         description: this is the sorting selector
     *         schema:
     *           type: string
     *           example: ascending
     *       - name: date
     *         in: query
     *         description: this is date value
     *         schema:
     *           type: string
     *           example: 2021-03-17T18:30:00.000Z
     *     responses:
     *       200:
     *         description: This will notify successfull implementation of query
     *         content:
     *           application/json:
     *              schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: int
     *                   example: 200
     *                 data:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       currentStatus:
     *                         type: string
     *                         example: pending-L1
     *                       isL1Required:
     *                         type: boolean
     *                         example: true
     *                       _id:
     *                         type: string
     *                         example: 603f8d8bdf620c0f819813ee
     *                       empId:
     *                         type: string
     *                         example: gs-lse-01
     *                       practice:
     *                         type: string
     *                         example: IDM
     *                       facilityName:
     *                         type: string
     *                         example: AAG
     *                       floorNo:
     *                         type: int
     *                         example: 2
     *                       floorId:
     *                         type: string
     *                         example: 60391eee1a1d0c00bbe763d6
     *                       selectedSeats:
     *                         type: array
     *                         items:
     *                           type: object
     *                           properties:
     *                             _id:
     *                               type: string
     *                               example: 6040986b80fd2f312205aa16
     *                             seatId:
     *                               type: string
     *                               example: 60406f351977781b8d2be1a5
     *                             seatNo:
     *                               type: int
     *                               example: 2001
     *                             bookedFor:
     *                               type: string
     *                               example: gs-0858
     *                             bookedForName:
     *                               type: string
     *                               example: Pankaj Khamkar
     *                             bookedBy:
     *                               type: string
     *                               example: gs-lse-01
     *                       fromDate:
     *                         type: string
     *                         example: 2021-03-17T18:30:00.000Z
     *                       toDate:
     *                         type: string
     *                         example: 2021-03-17T18:30:00.000Z
     *                       requestSummary:
     *                         type: string
     *                         example: testing
     *                       L1Approver:
     *                         type: string
     *                         example: gs-lse-01
     *                       title:
     *                         type: string
     *                         example: Senior Software Engineer
     *                       actionNote:
     *                         type: string
     *                         example:
     *                       requestId:
     *                         type: string
     *                         example: 17661443
     *                       L2Approver:
     *                         type: string
     *                         example: GS-0888
     *                       _v:
     *                         type: int
     *                         example: 5
     *       400:
     *         description: Bad Request
     *         content:
     *           application/json:
     *              schema:
     *               type: object
     *               properties:
     *                 error:
     *                   type: object
     *                   example: {}
     *
     */

    router
        .route('/book-seats/approvalBookings')
        .get(auth, controller.getPendingApprovalBookings);

    /**
     * @swagger
     *
     * /book-seats/bookings/actionOnBookings:
     *   post:
     *     summary: Action on Booking API
     *     description: This API is for action on booking.
     *     tags:
     *       - Book Seats
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               requestId:
     *                 type: string
     *                 example: 26176549
     *               action:
     *                 type: string
     *                 example: rejected
     *               rejectionReason:
     *                 type: string
     *                 example: not allowed
     *     responses:
     *       200:
     *         description: This will notify successfull implementation of query
     *         content:
     *           application/json:
     *              schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: int
     *                   example: 200
     *                 data:
     *                   type: string
     *                   example: executed
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
     *                   example: malformed booking, seat details not found
     *
     */

    router
        .route('/book-seats/actionOnBookings')
        .post(auth, controller.actionOnBookings);

    router
        .route('/book-seats/bookings/download')
        .get(auth, controller.downloadBookings);
};
