const { APPROVAL_LEVEL } = require('./constants/constants');
const FacilityAdmins = require('./models/facilityAdmin.model');
const Clients = require('./models/utils.model');
const { getPendingRequestCount } = require('./services/common.util.service');

let io;

exports.init = (server) => {
    io = require('socket.io')(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
        path: '/notifications',
    });
    return io;
};

exports.connectWithClient = async (socket, employeeId) => {
    if (employeeId) {
        await Clients.updateOne(
            { employeeId },
            { employeeId, socketId: socket.id },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        const employeeRoles = await FacilityAdmins.findOne({
            empId: employeeId,
        }).select('-_id roles');
        if (employeeRoles) {
            await sendNotification(
                socket,
                employeeId,
                employeeRoles._doc.roles
            );
        } else {
            await sendNotification(socket, employeeId);
        }
    }
};

exports.handleDisconnection = async (socket, employeeId) => {
    socket.on('disconnect', async () => {
        await Clients.deleteOne({ employeeId });
    });
};

exports.listenForAction = (socket, employee) => {
    socket.on('actioned_upon', async (data) => {
        const employeeId = employee.empId;
        let clientIds = [];
        if (data.manager) {
            const isManagerL1 = await FacilityAdmins.findOne({
                empId: data.manager.toLowerCase(),
                assignedPractices: data.practice,
                roles: data.roles,
            });
            if (!isManagerL1) {
                clientIds.push({ empId: data.manager.toLowerCase() });
            } else {
                clientIds = await getFAList(data.practice, data.roles);
            }
        } else {
            clientIds = await getFAList(data.practice, data.roles);
        }
        clientIds = clientIds.map((clientId) => clientId.empId);

        if (clientIds.length) {
            const clients = await Clients.find({
                employeeId: { $in: clientIds },
            });
            if (clients.length) {
                await Promise.all(
                    clients.map(async (client) => {
                        await sendNotification(
                            socket,
                            client.employeeId,
                            data.roles,
                            client.socketId
                        );
                        socket.leave(client.socketId);
                    })
                );
            }
        }
        await sendNotification(socket, employeeId);
    });
};

exports.listenForNewRequest = (socket) => {
    socket.on('new_request', async (data) => {
        let clientIds = [];
        if (data.approvalLevel === APPROVAL_LEVEL.L0) {
            if (data.manager) {
                const isManagerL1 = await FacilityAdmins.findOne({
                    empId: data.manager.toLowerCase(),
                    assignedPractices: data.practice,
                    roles: data.roles,
                });
                if (!isManagerL1) {
                    clientIds.push({ empId: data.manager.toLowerCase() });
                } else {
                    clientIds = await getFAList(data.practice, data.roles);
                }
            } else {
                clientIds = await getFAList(data.practice, data.roles);
            }
        } else {
            clientIds = await getFAList(data.practice, data.roles);
        }
        clientIds = clientIds.map((client) => client.empId);
        const clients = await Clients.find({
            employeeId: { $in: clientIds },
        });
        if (clients.length) {
            await Promise.all(
                clients.map(async (client) => {
                    const notificationCount = await getPendingRequestCount(
                        client.employeeId,
                        data.roles
                    );
                    socket.to(client.socketId).emit('pending_requests', {
                        notificationCount,
                    });
                })
            );
        }
        console.log(clientIds);
    });
};

async function sendNotification(socket, employeeId, roles, socketId) {
    const SocketID = socketId || socket.id;
    socket.join(SocketID);
    const notificationCount = await getPendingRequestCount(employeeId, roles);
    io.to(SocketID).emit('pending_requests', {
        notificationCount,
    });
}

function getFAList(practice, roles) {
    return FacilityAdmins.find({
        $or: [
            { isSuperAdmin: true },
            {
                assignedPractices: practice,
                roles,
            },
        ],
    }).select('-_id empId');
}
