require('./environments/env')();

const fs = require('fs');
const https = require('https');
const app = require('./app');
const {
    connectWithClient,
    handleDisconnection,
    listenForAction,
    listenForNewRequest,
} = require('./socket');
const { getEmployeeFromToken } = require('./services/common.util.service');

const port = +process.env.PORT;
app.set('port', port);

let key = fs.readFileSync('key.pem'),
    cert = fs.readFileSync('cert.pem');

if (process.env.ENVIRONMENT === 'prod' && process.env.GS_CERT === 'true') {
    key = fs.readFileSync('key.key');
    cert = fs.readFileSync('gslab.crt');
}

const server = https.createServer({ key, cert }, app);

const io = require('./socket').init(server);

io.on('connection', async (socket) => {
    const token = socket.handshake.auth.authToken.split(' ')[1];
    if (token) {
        const employee = await getEmployeeFromToken(token);

        if (employee) {
            const employeeId = employee.empId;

            connectWithClient(socket, employeeId);

            listenForAction(socket, employee);

            listenForNewRequest(socket);

            handleDisconnection(socket, employeeId);
        }
    }
});

server.listen(port, () => {
    console.log('Server is *_* at port', port);
});
