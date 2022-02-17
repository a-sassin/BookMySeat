const auth = require('../middleware/auth');
const controller = require('../controllers/blockFacility.controller');

module.exports = (router) => {
    /**
     * @swagger
     *
     * tags:
     *   - name: Block Dates
     *
     */

    /**
     * @swagger
     *
     * /block-dates:
     *   post:
     *     summary: Block Dates API
     *     description: This API is for blocking seats of faciity on selected floors on selected dates
     *     tags:
     *       - Block Dates
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               fromDate:
     *                 type: string
     *                 example: 2021-03-15T18:30:00.000Z
     *               toDate:
     *                 type: string
     *                 example: 2021-03-19T18:30:00.000Z
     *               data:
     *                 type: array
     *                 items:
     *                   type: object
     *                   properties:
     *                     faciityId:
     *                       type: string
     *                       example: AAG
     *                     floorNo:
     *                        type: array
     *                        items:
     *                          type: int
     *                          example: 2
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
    router
        .route('/block-facility')
        .post(auth, controller.blockFacilityController);
    router
        .route('/block-facility/unblock')
        .post(auth, controller.unblockFacilityController);
    router
        .route('/block-facility/history')
        .get(auth, controller.blockHistoryController);
    router.route('/block-facility').put(auth, controller.updateBlockFacility);
};
