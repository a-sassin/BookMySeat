const auth = require('../middleware/auth');
const controller = require('../controllers/employee.controller');

module.exports = (router) => {
    /**
     * @swagger
     *
     * tags:
     *   - name: Employee
     *
     */

    /**
     * @swagger
     *
     * /employee/login:
     *   post:
     *     summary: Login API
     *     description: This API is for login
     *     tags:
     *       - Employee
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
     *               password:
     *                 type: string
     *                 example: password
     *               keepMeSignedIn:
     *                 type: boolean
     *                 example: false
     *     responses:
     *       200:
     *         description: This will notify successfull implementation of query
     *         content:
     *           application/json:
     *              schema:
     *               type: object
     *               properties:
     *                 data:
     *                   type: object
     *                   properties:
     *                     name:
     *                       type: string
     *                       example: Lead Software Engineer
     *                     empId:
     *                       type: string
     *                       example: gs-lse-01
     *                     token:
     *                       type: string
     *                       example: TOKEN
     *                     email:
     *                       type: string
     *                       example: gs.lse01@mailinator.com
     *                     department:
     *                       type: string
     *                       example: Engineering
     *                     designation:
     *                       type: string
     *                       example: Lead Software Engineer
     *                     practice:
     *                       type: string
     *                       example: IDM
     *                     project:
     *                       type: string
     *                       example: project
     *                     manager:
     *                       type: string
     *                       example: gs-atm-01
     *                     subordinates:
     *                       type: array
     *                       items:
     *                         types: object
     *                         properties:
     *                           name:
     *                             type: string
     *                             example: Software Engineer012
     *                           empId:
     *                             type: string
     *                             example: gs-se-12
     *       403:
     *         description: Invalid Credentials
     *         content:
     *           application/json:
     *              schema:
     *               type: object
     *               properties:
     *                 errorMessage:
     *                   type: string
     *                   example: invalid credentials, User not found. Check credentials and retry
     */
    router.route('/employee/login').post(controller.employeeLogIn);

    /**
     * @swagger
     *
     * /employee/logout:
     *   post:
     *     summary: Logout API
     *     description: This API is for logout
     *     tags:
     *       - Employee
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
     *     responses:
     *       200:
     *         description: This will notify successfull implementation of query
     *         content:
     *           application/json:
     *              schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Successfully Logged Out
     *       403:
     *         description: Invalid Credentials
     *         content:
     *           application/json:
     *              schema:
     *               type: object
     *               properties:
     *                 errorMessage:
     *                   type: string
     *                   example: invalid credentials, User not found. Check credentials and retry
     */
    router.route('/employee/logout').post(auth, controller.employeeLogOut);

    router.route('/getEmployees').get(auth, controller.getEmployees);
};
